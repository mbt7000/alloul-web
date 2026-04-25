from __future__ import annotations

import hashlib
import logging
import random
import time
from collections import defaultdict
from threading import Lock
from typing import Annotated, Any, Dict

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import jwk, jwt, JWTError

logger = logging.getLogger(__name__)

# ── In-memory rate limiter (login brute-force protection) ────────────────────
# Limits: 10 attempts per IP per 5 minutes
_rate_lock = Lock()
_login_attempts: dict[str, list[float]] = defaultdict(list)
_RATE_WINDOW = 300   # 5 minutes
_RATE_MAX    = 10    # max attempts per window


def _check_login_rate(ip: str) -> None:
    now = time.time()
    with _rate_lock:
        attempts = [t for t in _login_attempts[ip] if now - t < _RATE_WINDOW]
        if len(attempts) >= _RATE_MAX:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again in 5 minutes.",
            )
        attempts.append(now)
        _login_attempts[ip] = attempts
from pydantic import BaseModel
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


# ── Apple native sign-in ──────────────────────────────────────────────────────

class AppleNativeRequest(BaseModel):
    identity_token: str
    nonce: str  # raw nonce (unhashed)
    bundle_id: str = "app.alloul.mobile"


_apple_keys_cache: Dict[str, Any] = {}


async def _get_apple_public_key(kid: str) -> Any:
    global _apple_keys_cache
    if kid not in _apple_keys_cache:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://appleid.apple.com/auth/keys")
            resp.raise_for_status()
            for k in resp.json().get("keys", []):
                _apple_keys_cache[k["kid"]] = k
    return _apple_keys_cache.get(kid)


async def verify_apple_identity_token(identity_token: str, raw_nonce: str, bundle_id: str) -> dict:
    header = jwt.get_unverified_header(identity_token)
    apple_jwk = await _get_apple_public_key(header["kid"])
    if not apple_jwk:
        raise ValueError("Apple public key not found")
    public_key = jwk.construct(apple_jwk, algorithm="RS256")
    claims = jwt.decode(
        identity_token,
        public_key,
        algorithms=["RS256"],
        audience=bundle_id,
        issuer="https://appleid.apple.com",
    )
    expected_nonce = hashlib.sha256(raw_nonce.encode()).hexdigest()
    if claims.get("nonce") != expected_nonce:
        raise ValueError("Nonce mismatch")
    return claims

router = APIRouter(prefix="/auth", tags=["auth"])


def _generate_user_icode(db: Session) -> str:
    count = db.query(User).count()
    if count < 100_000:
        lo, hi = 10_000_000, 99_999_999  # 8 digits
    elif count < 1_000_000:
        lo, hi = 1_000_000_000, 9_999_999_999  # 10 digits
    else:
        lo, hi = 100_000_000_000, 999_999_999_999  # 12 digits
    for _ in range(200):
        code = str(random.randint(lo, hi))
        if not db.query(User).filter(User.i_code == code).first():
            return code
    raise RuntimeError("Unable to generate unique i_code")


def _generate_employee_no(db: Session) -> str:
    """Generate a unique sequential 5-digit employee number starting at 10001."""
    # Get the highest existing employee_no
    from sqlalchemy import func as _func
    last = db.query(_func.max(User.employee_no)).scalar()
    if last and str(last).isdigit():
        next_no = int(last) + 1
    else:
        # Count existing users and start from 10001
        count = db.query(User).count()
        next_no = 10001 + count
    # Ensure uniqueness
    for delta in range(1000):
        candidate = str(next_no + delta)
        if not db.query(User).filter(User.employee_no == candidate).first():
            return candidate
    raise RuntimeError("Unable to generate unique employee_no")


def _ensure_icode(user: User, db: Session) -> None:
    changed = False
    if not user.i_code:
        user.i_code = _generate_user_icode(db)
        changed = True
    if not getattr(user, "employee_no", None):
        user.employee_no = _generate_employee_no(db)
        changed = True
    if changed:
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
        employee_no=getattr(user, "employee_no", None),
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
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    ip = request.client.host if request.client else "unknown"
    _check_login_rate(ip)
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
            employee_no=_generate_employee_no(db),
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
        logger.warning("Registration validation error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid registration data",
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


@router.post("/migrate-icodes", include_in_schema=False)
def migrate_icodes(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Migrate all users with short i_codes to new 8+ digit format."""
    updated = 0
    all_users = db.query(User).all()
    for u in all_users:
        if not u.i_code or len(u.i_code) < 8:
            u.i_code = _generate_user_icode(db)
            updated += 1
    db.commit()
    return {"updated": updated}


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
                employee_no=_generate_employee_no(db),
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


@router.post("/apple-native", response_model=FirebaseResponse)
async def apple_native(
    body: AppleNativeRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """Verify Apple identity token directly (for native iOS — bundle ID audience)."""
    try:
        claims = await verify_apple_identity_token(body.identity_token, body.nonce, body.bundle_id)
    except (JWTError, ValueError, httpx.HTTPError) as exc:
        logger.warning("Apple token verification failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired Apple token")

    apple_uid = claims.get("sub")
    email = claims.get("email") or ""
    name = (email.split("@")[0] if email else f"apple_{apple_uid[:8]}") if apple_uid else "apple_user"

    uid_key = f"apple:{apple_uid}"
    user = db.query(User).filter(User.firebase_uid == uid_key).first()
    if user:
        if email: user.email = email
        _ensure_icode(user, db)
        db.commit()
        db.refresh(user)
    else:
        existing = db.query(User).filter(User.email == email).first() if email else None
        if existing:
            existing.firebase_uid = uid_key
            _ensure_icode(existing, db)
            db.commit()
            db.refresh(existing)
            user = existing
        else:
            username = name.replace(".", "_")
            base_username = username
            n = 0
            while db.query(User).filter(User.username == username).first():
                n += 1
                username = f"{base_username}_{n}"
            user = User(
                email=email or f"{apple_uid}@apple.local",
                username=username,
                hashed_password=None,
                name=name,
                firebase_uid=uid_key,
                i_code=_generate_user_icode(db),
                employee_no=_generate_employee_no(db),
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    return FirebaseResponse(access_token=token, token_type="bearer", user=_user_to_response(user))


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
                employee_no=_generate_employee_no(db),
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
