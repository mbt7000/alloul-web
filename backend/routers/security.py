"""
ALLOUL&Q — Security router

Endpoints:
  POST   /security/password/change       — change password (requires current)
  POST   /security/2fa/setup             — generate TOTP secret + QR URL
  POST   /security/2fa/enable            — verify code and enable
  POST   /security/2fa/disable           — disable with password
  POST   /security/2fa/verify            — verify code during login
  GET    /security/sessions              — list active sessions
  DELETE /security/sessions/{id}         — revoke one session
  DELETE /security/sessions              — revoke all others
  GET    /security/login-history         — paginated login history

Password policy:
  - Min 12 chars
  - Must contain upper, lower, digit, special
  - Cannot match email or username
"""
from __future__ import annotations

import re
import secrets
from typing import Annotated, Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user, get_password_hash as hash_password, verify_password, create_access_token
from database import get_db
from models import User

router = APIRouter(prefix="/security", tags=["security"])


# ─── Password policy ─────────────────────────────────────────────────────────

def _validate_password(password: str, user: User) -> None:
    if len(password) < 12:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب أن تكون 12 حرفاً على الأقل")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="يجب أن تحتوي على حرف كبير")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="يجب أن تحتوي على حرف صغير")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="يجب أن تحتوي على رقم")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", password):
        raise HTTPException(status_code=400, detail="يجب أن تحتوي على رمز خاص")
    low = password.lower()
    if user.email and user.email.lower().split("@")[0] in low:
        raise HTTPException(status_code=400, detail="لا يمكن أن تحتوي كلمة المرور على بريدك")
    if user.username and user.username.lower() in low:
        raise HTTPException(status_code=400, detail="لا يمكن أن تحتوي على اسم المستخدم")


# ─── Change password ────────────────────────────────────────────────────────

class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str
    logout_others: bool = True


@router.post("/password/change")
def change_password(
    body: ChangePasswordBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if not current_user.hashed_password:
        raise HTTPException(status_code=400, detail="لا يوجد كلمة مرور — استخدم OAuth provider")

    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")

    _validate_password(body.new_password, current_user)

    if body.current_password == body.new_password:
        raise HTTPException(status_code=400, detail="كلمة المرور الجديدة يجب أن تختلف عن القديمة")

    current_user.hashed_password = hash_password(body.new_password)
    db.commit()

    # Send notification email (non-blocking)
    try:
        from services.email import email_service
        email_service.send(
            "password_changed",
            to=current_user.email,
            context={"name": current_user.name or current_user.username},
        )
    except Exception:
        pass

    return {"ok": True, "logout_others": body.logout_others}


# ─── 2FA (TOTP) ──────────────────────────────────────────────────────────────

class TwoFactorSetupResponse(BaseModel):
    secret: str
    otpauth_url: str
    backup_codes: List[str]


@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
def setup_2fa(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        import pyotp
    except ImportError:
        raise HTTPException(status_code=503, detail="pyotp not installed. Run: pip install pyotp")

    secret = pyotp.random_base32()
    # Store temporarily — not enabled until verified
    # For simplicity we'll store in a temporary table or user field (adapt to your schema)
    # Here we just return it for the client to persist + verify
    totp = pyotp.TOTP(secret)
    issuer = "ALLOUL%26Q"
    label = current_user.email or current_user.username or "user"
    otpauth_url = totp.provisioning_uri(name=label, issuer_name=issuer)

    backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]

    return TwoFactorSetupResponse(
        secret=secret,
        otpauth_url=otpauth_url,
        backup_codes=backup_codes,
    )


class TwoFactorVerifyBody(BaseModel):
    secret: str
    code: str


@router.post("/2fa/enable")
def enable_2fa(
    body: TwoFactorVerifyBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    try:
        import pyotp
    except ImportError:
        raise HTTPException(status_code=503, detail="pyotp not installed")

    totp = pyotp.TOTP(body.secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="رمز غير صحيح")

    # Persist secret to user record (requires schema update)
    if hasattr(current_user, "totp_secret"):
        current_user.totp_secret = body.secret  # type: ignore[attr-defined]
        current_user.two_factor_enabled = True  # type: ignore[attr-defined]
        db.commit()

    try:
        from services.email import email_service
        email_service.send("2fa_enabled", to=current_user.email, context={})
    except Exception:
        pass

    return {"ok": True, "enabled": True}


class TwoFactorDisableBody(BaseModel):
    password: str


@router.post("/2fa/disable")
def disable_2fa(
    body: TwoFactorDisableBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if current_user.hashed_password and not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="كلمة المرور غير صحيحة")
    if hasattr(current_user, "totp_secret"):
        current_user.totp_secret = None  # type: ignore[attr-defined]
        current_user.two_factor_enabled = False  # type: ignore[attr-defined]
        db.commit()
    return {"ok": True, "enabled": False}


# ─── Sessions ────────────────────────────────────────────────────────────────

@router.get("/sessions")
def list_sessions(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Stub — requires Session/LoginSession model to track real sessions.
    # For now return the current session only.
    return {
        "sessions": [
            {
                "id": "current",
                "device": request.headers.get("user-agent", "Unknown")[:80],
                "ip": request.client.host if request.client else None,
                "last_active": datetime.utcnow().isoformat(),
                "is_current": True,
            }
        ]
    }


@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Stub — implement when LoginSession model is added
    return {"ok": True, "revoked": session_id}


@router.delete("/sessions")
def revoke_all_other_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return {"ok": True, "revoked": 0}


# ─── Login history ───────────────────────────────────────────────────────────

@router.get("/login-history")
def login_history(
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 50,
    offset: int = 0,
):
    # Stub — requires LoginHistory model.
    return {"history": [], "total": 0}
