"""
Admin endpoints — verification management, user administration.
Access: emails in ADMIN_ALLOWED_EMAILS and/or usernames in ADMIN_USERNAMES (see config).
"""
from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from admin_access import require_admin_user
from database import get_db
from models import User

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(current_user: User) -> User:
    return require_admin_user(current_user)


# ── Verification levels ──
# 0 = not verified
# 1 = verified (blue badge)
# 2 = official / business
# 3 = celebrity / notable


class VerifyRequest(BaseModel):
    user_id: int
    level: int = 1  # 1=verified, 2=official, 3=celebrity


class UserAdminResponse(BaseModel):
    id: int
    email: str
    username: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    i_code: Optional[str] = None
    verified: int = 0
    posts_count: int = 0
    followers_count: int = 0
    created_at: Optional[str] = None


class AdminStatsResponse(BaseModel):
    total_users: int
    verified_users: int
    total_posts: int
    total_companies: int


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_admin(current_user)
    from models import Post, Company
    return AdminStatsResponse(
        total_users=db.query(User).count(),
        verified_users=db.query(User).filter(User.verified > 0).count(),
        total_posts=db.query(Post).count(),
        total_companies=db.query(Company).count(),
    )


@router.get("/users", response_model=list[UserAdminResponse])
def list_users(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
):
    _require_admin(current_user)
    q = db.query(User).order_by(User.id.desc())
    if search:
        term = f"%{search}%"
        q = q.filter(
            User.username.ilike(term) | User.name.ilike(term) | User.email.ilike(term) | User.i_code.ilike(term)
        )
    users = q.offset(offset).limit(limit).all()
    return [
        UserAdminResponse(
            id=u.id,
            email=u.email,
            username=u.username,
            name=u.name,
            avatar_url=u.avatar_url,
            i_code=u.i_code,
            verified=u.verified or 0,
            posts_count=u.posts_count or 0,
            followers_count=u.followers_count or 0,
            created_at=u.created_at.isoformat() if u.created_at else None,
        )
        for u in users
    ]


@router.post("/verify")
def verify_user(
    body: VerifyRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_admin(current_user)
    if body.level not in (0, 1, 2, 3):
        raise HTTPException(status_code=400, detail="Level must be 0-3")
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.verified = body.level
    db.commit()
    level_names = {0: "unverified", 1: "verified", 2: "official", 3: "celebrity"}
    return {"message": f"User {user.username} is now {level_names.get(body.level, 'unknown')}"}


@router.post("/unverify")
def unverify_user(
    body: VerifyRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    _require_admin(current_user)
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.verified = 0
    db.commit()
    return {"message": f"User {user.username} verification removed"}
