from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from auth import decode_token, get_current_user
from database import get_db
from models import User, CallLog, DirectConversation, DirectMessage

router = APIRouter(tags=["calls"])


# ─── WebSocket Manager ───────────────────────────────────────────────────────

class CallManager:
    def __init__(self) -> None:
        self.connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, ws: WebSocket, subprotocol: str | None = None) -> None:
        # If client sent a subprotocol (bearer auth), echo it back on accept.
        if subprotocol:
            await ws.accept(subprotocol=subprotocol)
        else:
            await ws.accept()
        self.connections[user_id] = ws

    def disconnect(self, user_id: int) -> None:
        self.connections.pop(user_id, None)

    async def send(self, user_id: int, data: dict) -> bool:
        ws = self.connections.get(user_id)
        if not ws:
            return False
        try:
            await ws.send_json(data)
            return True
        except Exception:
            self.disconnect(user_id)
            return False

    def is_online(self, user_id: int) -> bool:
        return user_id in self.connections


call_manager = CallManager()


# ─── Expo Push Notification ──────────────────────────────────────────────────

async def _send_expo_push(token: str, title: str, body: str, data: dict) -> None:
    if not token or not token.startswith("ExponentPushToken"):
        return
    payload = {
        "to": token,
        "title": title,
        "body": body,
        "data": data,
        "priority": "high",
        "sound": "default",
        "channelId": "calls",
        "_displayInForeground": True,
    }
    async with httpx.AsyncClient(timeout=5) as client:
        try:
            await client.post("https://exp.host/--/api/v2/push/send", json=payload)
        except Exception:
            pass


# ─── Schemas ─────────────────────────────────────────────────────────────────

class InitiateCallBody(BaseModel):
    receiver_id: int
    call_type: str = "video"  # video | audio

class UpdatePresenceBody(BaseModel):
    status: str  # online | busy | offline | away

class SavePushTokenBody(BaseModel):
    token: str


# ─── Presence ────────────────────────────────────────────────────────────────

@router.put("/users/presence")
def update_presence(
    body: UpdatePresenceBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if body.status not in ("online", "busy", "offline", "away"):
        raise HTTPException(400, "Invalid status")
    current_user.presence_status = body.status
    db.commit()
    return {"status": body.status}


@router.post("/users/expo-push-token")
def save_push_token(
    body: SavePushTokenBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    current_user.expo_push_token = body.token
    db.commit()
    return {"ok": True}


@router.get("/users/{user_id}/profile")
def get_user_public_profile(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return a public profile for a user (name, avatar, bio, work_id, company)."""
    from models import CompanyMember, Company  # local import to avoid circular
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    # Try to find their membership in any company
    membership = (
        db.query(CompanyMember)
        .filter(CompanyMember.user_id == user_id)
        .order_by(CompanyMember.id.desc())
        .first()
    )
    company_name = None
    role = None
    job_title = None
    if membership:
        company = db.query(Company).filter(Company.id == membership.company_id).first()
        company_name = company.name if company else None
        role = membership.role
        job_title = membership.job_title

    return {
        "id": user.id,
        "name": user.name or user.username or f"مستخدم #{user.id}",
        "email": user.email,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "work_id": getattr(user, "employee_no", None),
        "job_title": job_title,
        "company_name": company_name,
        "role": role,
    }


@router.get("/users/{user_id}/presence")
def get_user_presence(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return {"user_id": user_id, "presence_status": user.presence_status or "offline"}


# ─── Direct Messages ─────────────────────────────────────────────────────────

class DMBody(BaseModel):
    content: str


def _get_or_create_conversation(db: Session, user1_id: int, user2_id: int) -> DirectConversation:
    """Get or create a DM conversation between two users (ordered IDs)."""
    lo, hi = min(user1_id, user2_id), max(user1_id, user2_id)
    conv = (
        db.query(DirectConversation)
        .filter(DirectConversation.user1_id == lo, DirectConversation.user2_id == hi)
        .first()
    )
    if not conv:
        conv = DirectConversation(user1_id=lo, user2_id=hi)
        db.add(conv)
        db.commit()
        db.refresh(conv)
    return conv


@router.get("/chat/dm/{user_id}")
def get_dm_messages(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return DM messages between current user and user_id."""
    conv = _get_or_create_conversation(db, current_user.id, user_id)
    msgs = (
        db.query(DirectMessage)
        .filter(DirectMessage.conversation_id == conv.id)
        .order_by(DirectMessage.created_at.asc())
        .all()
    )
    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in msgs
    ]


@router.post("/chat/dm/{user_id}")
def send_dm_message(
    user_id: int,
    body: DMBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Send a DM from current user to user_id."""
    if not body.content.strip():
        raise HTTPException(400, "Content cannot be empty")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    conv = _get_or_create_conversation(db, current_user.id, user_id)
    msg = DirectMessage(
        conversation_id=conv.id,
        sender_id=current_user.id,
        content=body.content.strip(),
    )
    db.add(msg)
    # Update conversation last_message_at
    from datetime import datetime, timezone as _tz
    conv.last_message_at = datetime.now(_tz.utc)
    db.commit()
    db.refresh(msg)
    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "content": msg.content,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


# ─── WebSocket ───────────────────────────────────────────────────────────────

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    token: str = Query(default=None),  # Legacy fallback — deprecated
):
    # SECURITY: Prefer token from Sec-WebSocket-Protocol header.
    # Client sends subprotocols: ["bearer", "<token>"]
    # Falls back to ?token= query for older clients (deprecated).
    header_token: str | None = None
    try:
        subprotocols_header = websocket.headers.get("sec-websocket-protocol", "")
        if subprotocols_header:
            parts = [p.strip() for p in subprotocols_header.split(",")]
            if len(parts) >= 2 and parts[0].lower() == "bearer":
                header_token = parts[1]
    except Exception:
        header_token = None

    effective_token = header_token or token

    if not effective_token:
        await websocket.close(code=4001)
        return

    # Accept the subprotocol echo (browsers require this for header-based flow)
    accept_subprotocol = "bearer" if header_token else None

    payload = decode_token(effective_token)
    if not payload or payload.get("sub") != str(user_id):
        await websocket.close(code=4001)
        return

    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=4004)
            return

        await call_manager.connect(user_id, websocket, accept_subprotocol)
        user.presence_status = "online"
        db.commit()

        try:
            while True:
                data = await websocket.receive_json()
                event = data.get("type")

                if event == "ping":
                    await websocket.send_json({"type": "pong"})

                elif event == "presence_update":
                    status = data.get("status", "online")
                    if status in ("online", "busy", "offline", "away"):
                        user.presence_status = status
                        db.commit()

        except WebSocketDisconnect:
            pass
        finally:
            call_manager.disconnect(user_id)
            user.presence_status = "offline"
            db.commit()
    finally:
        db.close()


# ─── Call Endpoints ──────────────────────────────────────────────────────────

@router.post("/call/initiate")
async def initiate_call(
    body: InitiateCallBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    receiver = db.query(User).filter(User.id == body.receiver_id).first()
    if not receiver:
        raise HTTPException(404, "User not found")
    if receiver.presence_status == "busy":
        raise HTTPException(409, "المستخدم مشغول حالياً")

    # Create 1-on-1 Daily room
    from routers.daily_workspace import create_1on1_room
    room_data = await create_1on1_room(current_user.id, body.receiver_id)

    log = CallLog(
        caller_id=current_user.id,
        receiver_id=body.receiver_id,
        call_type=body.call_type,
        status="ringing",
        room_url=room_data["join_url"],
        room_name=room_data["room_name"],
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    caller_name = current_user.name or current_user.username
    call_payload = {
        "type": "incoming_call",
        "call_id": log.id,
        "caller_id": current_user.id,
        "caller_name": caller_name,
        "caller_avatar": current_user.avatar_url,
        "call_type": body.call_type,
        "room_url": room_data["join_url"],
    }

    delivered = await call_manager.send(body.receiver_id, call_payload)

    if not delivered and receiver.expo_push_token:
        label = "اتصال فيديو وارد" if body.call_type == "video" else "اتصال صوتي وارد"
        await _send_expo_push(
            receiver.expo_push_token,
            title=caller_name,
            body=label,
            data={**call_payload, "screen": "IncomingCall"},
        )

    return {
        "call_id": log.id,
        "room_url": room_data["join_url"],
        "room_name": room_data["room_name"],
    }


@router.post("/call/accept/{call_id}")
async def accept_call(
    call_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    log = db.query(CallLog).filter(
        CallLog.id == call_id,
        CallLog.receiver_id == current_user.id,
    ).first()
    if not log:
        raise HTTPException(404, "Call not found")

    log.status = "accepted"
    current_user.presence_status = "busy"
    db.commit()

    await call_manager.send(log.caller_id, {
        "type": "call_accepted",
        "call_id": call_id,
        "room_url": log.room_url,
    })

    return {"room_url": log.room_url, "room_name": log.room_name}


@router.post("/call/reject/{call_id}")
async def reject_call(
    call_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    log = db.query(CallLog).filter(
        CallLog.id == call_id,
        CallLog.receiver_id == current_user.id,
    ).first()
    if not log:
        raise HTTPException(404, "Call not found")

    log.status = "rejected"
    db.commit()

    await call_manager.send(log.caller_id, {"type": "call_rejected", "call_id": call_id})
    return {"ok": True}


@router.post("/call/end/{call_id}")
async def end_call(
    call_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    log = db.query(CallLog).filter(
        CallLog.id == call_id,
        or_(CallLog.caller_id == current_user.id, CallLog.receiver_id == current_user.id),
    ).first()
    if not log:
        raise HTTPException(404, "Call not found")

    now = datetime.now(timezone.utc)
    if log.status == "accepted" and log.started_at:
        started = log.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        log.duration = int((now - started).total_seconds())

    log.status = "ended"
    log.ended_at = now
    current_user.presence_status = "online"
    db.commit()

    other_id = log.receiver_id if log.caller_id == current_user.id else log.caller_id
    await call_manager.send(other_id, {
        "type": "call_ended",
        "call_id": call_id,
        "duration": log.duration,
    })

    other = db.query(User).filter(User.id == other_id).first()
    if other and other.presence_status == "busy":
        other.presence_status = "online"
        db.commit()

    return {"ok": True, "duration": log.duration}


@router.get("/call/history")
def get_call_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 50,
):
    logs = (
        db.query(CallLog)
        .filter(or_(CallLog.caller_id == current_user.id, CallLog.receiver_id == current_user.id))
        .order_by(CallLog.started_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for log in logs:
        is_outgoing = log.caller_id == current_user.id
        other_id = log.receiver_id if is_outgoing else log.caller_id
        other = db.query(User).filter(User.id == other_id).first()
        result.append({
            "id": log.id,
            "call_type": log.call_type,
            "status": log.status,
            "duration": log.duration,
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "is_outgoing": is_outgoing,
            "other_user_id": other_id,
            "other_user_name": (other.name or other.username) if other else "مجهول",
            "other_user_avatar": other.avatar_url if other else None,
        })
    return result
