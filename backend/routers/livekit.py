"""LiveKit rooms router — token generation + room management."""
from __future__ import annotations

import os, uuid, datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from livekit import api as lk_api

from auth import get_current_user
from database import get_db
from models import User, CompanyMember

router = APIRouter(prefix="/livekit", tags=["livekit"])

LIVEKIT_API_KEY    = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
LIVEKIT_WS_URL     = os.getenv("LIVEKIT_WS_URL", "wss://livekit.alloul.app")


def _make_token(
    room_name: str,
    identity: str,
    display_name: str = "",
    can_publish: bool = True,
    can_subscribe: bool = True,
    ttl_hours: int = 4,
) -> str:
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise HTTPException(status_code=503, detail="LiveKit credentials not configured")

    token = (
        lk_api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(display_name or identity)
        .with_grants(
            lk_api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=can_publish,
                can_subscribe=can_subscribe,
                can_publish_data=True,
            )
        )
        .with_ttl(datetime.timedelta(hours=ttl_hours))
    )
    return token.to_jwt()


# ── Schemas ────────────────────────────────────────────────────────────────────

class CreateRoomRequest(BaseModel):
    title: str
    max_participants: int = 50


class JoinRoomRequest(BaseModel):
    room_name: str
    display_name: Optional[str] = None


class RoomTokenResponse(BaseModel):
    room_name: str
    token: str
    ws_url: str
    title: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

def _get_company_id(db: Session, user_id: int) -> Optional[int]:
    """Return the company_id for the user, or None if they don't belong to one."""
    mem = db.query(CompanyMember).filter(CompanyMember.user_id == user_id).first()
    return mem.company_id if mem else None


@router.post("/rooms", response_model=RoomTokenResponse)
def create_room(
    body: CreateRoomRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Create a new LiveKit room — scoped to the user's company."""
    if not LIVEKIT_API_KEY:
        raise HTTPException(status_code=503, detail="LiveKit not configured")

    company_id = _get_company_id(db, current_user.id)
    if not company_id:
        raise HTTPException(status_code=403, detail="يجب أن تكون عضواً في شركة لإنشاء اجتماع")

    import re
    slug      = re.sub(r"[^a-z0-9]+", "-", body.title.strip().lower())[:30].strip("-")
    # room name embeds company_id → no cross-company access possible
    room_name = f"c{company_id}-{slug}-{uuid.uuid4().hex[:6]}"
    identity  = str(current_user.id)
    name      = current_user.name or current_user.username or identity

    token = _make_token(
        room_name=room_name,
        identity=identity,
        display_name=name,
        can_publish=True,
        can_subscribe=True,
    )

    return RoomTokenResponse(
        room_name=room_name,
        token=token,
        ws_url=LIVEKIT_WS_URL,
        title=body.title,
    )


@router.post("/rooms/{room_name}/join", response_model=RoomTokenResponse)
def join_room(
    room_name: str,
    body: JoinRoomRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Join an existing room — validates company ownership of the room."""
    if not LIVEKIT_API_KEY:
        raise HTTPException(status_code=503, detail="LiveKit not configured")

    company_id = _get_company_id(db, current_user.id)
    if not company_id:
        raise HTTPException(status_code=403, detail="يجب أن تكون عضواً في شركة للانضمام للاجتماع")

    # Validate room belongs to the same company (room name starts with c{company_id}-)
    if not room_name.startswith(f"c{company_id}-"):
        raise HTTPException(status_code=403, detail="لا يمكنك الانضمام لاجتماعات شركة أخرى")

    identity = str(current_user.id)
    name     = body.display_name or current_user.name or current_user.username or identity

    token = _make_token(
        room_name=room_name,
        identity=identity,
        display_name=name,
        can_publish=True,
        can_subscribe=True,
    )

    return RoomTokenResponse(
        room_name=room_name,
        token=token,
        ws_url=LIVEKIT_WS_URL,
        title=room_name,
    )
