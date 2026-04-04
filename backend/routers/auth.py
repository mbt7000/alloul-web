from __future__ import annotations

import random
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from auth import create_access_token, get_current_user, get_password_hash, verify_password
from database import get_db
from firebase_verify import verify_firebase_token, is_firebase_configured
from azure_ad_verify import verify_azure_ad_token
from config import settings
from admin_access import user_is_admin
from models import User
from schemas import (
    AzureAdRequest,
    ChangePasswordRequest,
    FirebaseRequest,
    FirebaseResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _generate_user_icode(db: Session) -> str:
    for _ in range(100):
        code = str(random.randint(100000, 999999))
        if not db.query(User).filter(User.i_code == code).first():
            return code
    raise RuntimeError("Unable to generate unique i_code")


def _ensure_icode(user: User, db: Session) -> None:
    if not user.i_code:
        user.i_code = _generate_user_icode(db)
        db.commit()
        db.refresh(user)


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        name=user.name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        i_code=user.i_code,
        cover_url=user.cover_url,
        location=getattr(user, "location", None),
        skills=getattr(user, "skills", None),
        username_changed=bool(getattr(user, "username_changed", 0)),
        followers_count=user.followers_count or 0,
        following_count=user.following_count or 0,
        posts_count=user.posts_count or 0,
        created_at=user.created_at.isoformat() if user.created_at else None,
        is_admin=user_is_admin(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        user = db.query(User).filter(User.email == body.email).first()
        if not user or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Wrong email or password",
            )
        if not verify_password(body.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Wrong email or password",
            )
        _ensure_icode(user, db)
        token = create_access_token(data={"sub": str(user.id)})
        return TokenResponse(access_token=token, token_type="bearer")
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Database error during login. On Postgres run: "
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(32); "
                "and align schema with models.py — see backend/README.md"
            ),
        ) from exc


@router.post("/register", response_model=TokenResponse)
def register(
    body: RegisterRequest,
    db: Annotated[Session, Depends(get_db)],
):
    try:
        if db.query(User).filter(User.username == body.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )
        if db.query(User).filter(User.email == body.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use",
            )
        user = User(
            email=body.email,
            username=body.username,
            hashed_password=get_password_hash(body.password),
            name=body.username,
            i_code=_generate_user_icode(db),
        )
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already in use",
            )
        except OperationalError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database unavailable; verify DATABASE_URL and that Postgres is running",
            )
        token = create_access_token(data={"sub": str(user.id)})
        return TokenResponse(access_token=token, token_type="bearer")
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc) or "Invalid registration data",
        ) from exc


@router.get("/me", response_model=UserResponse)
def me(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _ensure_icode(current_user, db)
    return _user_to_response(current_user)


@router.patch("/me", response_model=UserResponse)
def update_me(
    body: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if body.name is not None:
        current_user.name = body.name
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    if body.bio is not None:
        current_user.bio = body.bio
    if body.cover_url is not None:
        current_user.cover_url = body.cover_url
    if body.location is not None:
        current_user.location = body.location
    if body.skills is not None:
        current_user.skills = body.skills
    if body.username is not None and body.username != current_user.username:
        if getattr(current_user, "username_changed", 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Username can only be changed once",
            )
        existing = db.query(User).filter(User.username == body.username).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
        current_user.username = body.username
        current_user.username_changed = 1
    _ensure_icode(current_user, db)
    db.commit()
    db.refresh(current_user)
    return _user_to_response(current_user)


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account uses social login, no password to change",
        )
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters",
        )
    current_user.hashed_password = get_password_hash(body.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.get("/user/{i_code}", response_model=UserResponse)
def get_user_by_icode(
    i_code: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = db.query(User).filter(User.i_code == i_code).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_response(user)


@router.post("/firebase", response_model=FirebaseResponse)
def firebase(
    body: FirebaseRequest,
    db: Annotated[Session, Depends(get_db)],
):
    if not is_firebase_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase not configured on server",
        )
    claims = verify_firebase_token(body.id_token)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token",
        )
    uid = claims.get("uid")
    email = claims.get("email") or ""
    name = claims.get("name") or claims.get("email", "").split("@")[0]
    picture = claims.get("picture")

    user = db.query(User).filter(User.firebase_uid == uid).first()
    if user:
        user.email = email or user.email
        user.name = name or user.name
        user.avatar_url = picture or user.avatar_url
        _ensure_icode(user, db)
        db.commit()
        db.refresh(user)
    else:
        existing = db.query(User).filter(User.email == email).first() if email else None
        if existing:
            existing.firebase_uid = uid
            existing.name = name or existing.name
            existing.avatar_url = picture or existing.avatar_url
            _ensure_icode(existing, db)
            db.commit()
            db.refresh(existing)
            user = existing
        else:
            username = (email.split("@")[0] if email else f"user_{uid[:8]}").replace(".", "_")
            base_username = username
            n = 0
            while db.query(User).filter(User.username == username).first():
                n += 1
                username = f"{base_username}_{n}"
            user = User(
                email=email or f"{uid}@firebase.local",
                username=username,
                hashed_password=None,
                name=name,
                avatar_url=picture,
                firebase_uid=uid,
                i_code=_generate_user_icode(db),
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    return FirebaseResponse(
        access_token=token,
        token_type="bearer",
        user=_user_to_response(user),
    )


@router.post("/azure-ad", response_model=FirebaseResponse)
def azure_ad(
    body: AzureAdRequest,
    db: Annotated[Session, Depends(get_db)],
):
    if not settings.MICROSOFT_CLIENT_ID or not settings.MICROSOFT_TENANT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Azure AD SSO not configured",
        )
    claims = verify_azure_ad_token(
        body.id_token,
        settings.MICROSOFT_CLIENT_ID,
        settings.MICROSOFT_TENANT_ID,
    )
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Azure AD token",
        )
    oid = claims.get("oid") or claims.get("sub")
    email = claims.get("email") or claims.get("preferred_username") or ""
    name = claims.get("name") or (email.split("@")[0] if email else "User")
    picture = claims.get("picture")
    if not oid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")
    azure_uid = f"azure_{oid}"

    user = db.query(User).filter(User.firebase_uid == azure_uid).first()
    if user:
        user.email = email or user.email
        user.name = name or user.name
        user.avatar_url = picture or user.avatar_url
        _ensure_icode(user, db)
        db.commit()
        db.refresh(user)
    else:
        existing = db.query(User).filter(User.email == email).first() if email else None
        if existing:
            existing.firebase_uid = azure_uid
            existing.name = name or existing.name
            existing.avatar_url = picture or existing.avatar_url
            _ensure_icode(existing, db)
            db.commit()
            db.refresh(existing)
            user = existing
        else:
            username = (email.split("@")[0] if email else f"user_{oid[:8]}").replace(".", "_")
            base_username = username
            n = 0
            while db.query(User).filter(User.username == username).first():
                n += 1
                username = f"{base_username}_{n}"
            user = User(
                email=email or f"{oid}@azure.local",
                username=username,
                hashed_password=None,
                name=name,
                avatar_url=picture,
                firebase_uid=azure_uid,
                i_code=_generate_user_icode(db),
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    return FirebaseResponse(
        access_token=token,
        token_type="bearer",
        user=_user_to_response(user),
    )
