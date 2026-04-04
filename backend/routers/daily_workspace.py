"""
Daily.co — غرف فيديو + شات داخل الجلسة لمساحة الشركة.
يتطلب DAILY_API_KEY و DAILY_SUBDOMAIN في البيئة (مثل subdomain من لوحة Daily).
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from config import settings
from database import get_db
from models import ActivityLog, CompanyMember, User

router = APIRouter(prefix="/daily", tags=["daily"])


def _daily_subdomain() -> str:
    raw = (settings.DAILY_SUBDOMAIN or "").strip().lower().replace(".daily.co", "")
    if not raw or not re.match(r"^[a-z0-9][a-z0-9-]{0,62}$", raw):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Daily subdomain not configured (DAILY_SUBDOMAIN)",
        )
    return raw


def _daily_headers() -> dict[str, str]:
    key = (settings.DAILY_API_KEY or "").strip()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Daily API key not configured (DAILY_API_KEY)",
        )
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _daily_request(method: str, path: str, body: Optional[dict] = None) -> tuple[int, dict]:
    url = f"https://api.daily.co/v1{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    for k, v in _daily_headers().items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(err_body) if err_body else {}
        except json.JSONDecodeError:
            parsed = {"error": err_body or e.reason}
        return e.code, parsed


def _room_name_for_company(company_id: int) -> str:
    # Daily: أحرف صغيرة وأرقام وشرطة
    return f"co{company_id}hub"


def _ensure_room(room_name: str) -> None:
    code, data = _daily_request("GET", f"/rooms/{room_name}")
    if code == 200:
        return
    if code != 404:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=data.get("error") or data.get("info") or f"Daily GET room failed: {code}",
        )
    create_body = {
        "name": room_name,
        "privacy": "private",
        "properties": {
            "enable_chat": True,
            "enable_screenshare": True,
            "start_video_off": False,
            "start_audio_off": False,
            "max_participants": 100,
        },
    }
    c2, d2 = _daily_request("POST", "/rooms", create_body)
    if c2 not in (200, 201):
        # قد تكون الغرفة أُنشئت بالتوازي
        if "already exists" in str(d2).lower() or "unique" in str(d2).lower():
            return
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=d2.get("error") or d2.get("info") or f"Daily create room failed: {c2}",
        )


def _create_meeting_token(*, room_name: str, user_name: str) -> str:
    exp = int(time.time()) + 3600 * 6
    body = {
        "properties": {
            "room_name": room_name,
            "user_name": user_name[:64],
            "exp": exp,
        }
    }
    code, data = _daily_request("POST", "/meeting-tokens", body)
    if code not in (200, 201):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=data.get("error") or data.get("info") or f"Daily token failed: {code}",
        )
    token = data.get("token")
    if not token or not isinstance(token, str):
        raise HTTPException(status_code=502, detail="Daily returned no token")
    return token


class DailyJoinResponse(BaseModel):
    join_url: str
    room_name: str
    provider: str = "daily"


def _log_daily(db: Session, company_id: int, user_id: int, room_name: str) -> None:
    row = ActivityLog(
        company_id=company_id,
        user_id=user_id,
        action="daily_company_join",
        details=f"room={room_name}",
    )
    db.add(row)
    db.commit()


@router.get("/company-join", response_model=DailyJoinResponse)
def get_company_daily_join(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """
    يضمن غرفة خاصة بالشركة، يصدر meeting token للمستخدم الحالي، ويعيد رابط الانضمام.
    الشات داخل واجهة Daily (نفس الجلسة).
    """
    mem = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not mem:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company membership required")

    room_name = _room_name_for_company(mem.company_id)
    subdomain = _daily_subdomain()
    _ensure_room(room_name)

    display = (current_user.name or current_user.username or "member")[:64]
    token = _create_meeting_token(room_name=room_name, user_name=display)

    from urllib.parse import quote

    join_url = f"https://{subdomain}.daily.co/{room_name}?t={quote(token, safe='')}"
    _log_daily(db, mem.company_id, current_user.id, room_name)
    return DailyJoinResponse(join_url=join_url, room_name=room_name)
