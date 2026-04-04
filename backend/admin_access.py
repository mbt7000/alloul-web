"""Central admin checks: env allowlists + helpers for routers and /auth/me."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import HTTPException, status

from config import settings

if TYPE_CHECKING:
    from models import User


def _parse_csv_lower(s: str) -> set[str]:
    return {x.strip().lower() for x in (s or "").split(",") if x.strip()}


def admin_emails() -> set[str]:
    return _parse_csv_lower(settings.ADMIN_ALLOWED_EMAILS)


def admin_usernames() -> set[str]:
    return _parse_csv_lower(settings.ADMIN_USERNAMES)


def user_is_admin(user: "User") -> bool:
    email = (getattr(user, "email", None) or "").strip().lower()
    if email and email in admin_emails():
        return True
    username = (getattr(user, "username", None) or "").strip().lower()
    if username and username in admin_usernames():
        return True
    return False


def require_admin_user(current_user: "User") -> "User":
    if not user_is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
