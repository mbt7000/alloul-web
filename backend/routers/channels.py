from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, Channel, ChannelMessage, CompanyMember, Notification

router = APIRouter(prefix="/channels", tags=["channels"])

# ─── Default channels auto-created for every company ─────────────────────────

DEFAULT_CHANNELS = [
    {"name": "عام",         "type": "general",      "description": "القناة الرئيسية للفريق"},
    {"name": "إعلانات",     "type": "announcement", "description": "إعلانات الشركة والقرارات المهمة"},
    {"name": "عشوائي",      "type": "general",      "description": "محادثات خارج نطاق العمل"},
]

# ─── Schemas ─────────────────────────────────────────────────────────────────

class ChannelCreate(BaseModel):
    name: str
    type: Optional[str] = "general"
    description: Optional[str] = None


class MessageCreate(BaseModel):
    content: str


class AuthorInfo(BaseModel):
    id: int
    name: str
    avatar_url: Optional[str] = None


class MessageResponse(BaseModel):
    id: int
    channel_id: int
    user_id: int
    content: str
    author: AuthorInfo
    created_at: Optional[str] = None
    is_self: bool = False


class ChannelResponse(BaseModel):
    id: int
    company_id: int
    name: str
    description: Optional[str] = None
    type: str
    created_at: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    message_count: int = 0


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_company_id(db: Session, user_id: int) -> int:
    mem = db.query(CompanyMember).filter(CompanyMember.user_id == user_id).first()
    if not mem:
        raise HTTPException(status_code=403, detail="Not a company member")
    return mem.company_id


def _ensure_defaults(db: Session, company_id: int, created_by: int) -> None:
    """Auto-seed default channels if company has none."""
    count = db.query(Channel).filter(Channel.company_id == company_id).count()
    if count > 0:
        return
    for ch in DEFAULT_CHANNELS:
        db.add(Channel(
            company_id=company_id,
            name=ch["name"],
            type=ch["type"],
            description=ch["description"],
            created_by=created_by,
        ))
    db.commit()


def _to_channel_response(ch: Channel, db: Session) -> ChannelResponse:
    last = (
        db.query(ChannelMessage)
        .filter(ChannelMessage.channel_id == ch.id)
        .order_by(ChannelMessage.created_at.desc())
        .first()
    )
    count = db.query(ChannelMessage).filter(ChannelMessage.channel_id == ch.id).count()
    return ChannelResponse(
        id=ch.id,
        company_id=ch.company_id,
        name=ch.name,
        description=ch.description,
        type=ch.type,
        created_at=ch.created_at.isoformat() if ch.created_at else None,
        last_message=last.content[:80] if last else None,
        last_message_at=last.created_at.isoformat() if last and last.created_at else None,
        message_count=count,
    )


def _to_msg_response(msg: ChannelMessage, current_user_id: int) -> MessageResponse:
    author_name = (
        (msg.author.name or msg.author.username) if msg.author else f"user_{msg.user_id}"
    )
    return MessageResponse(
        id=msg.id,
        channel_id=msg.channel_id,
        user_id=msg.user_id,
        content=msg.content,
        author=AuthorInfo(
            id=msg.user_id,
            name=author_name,
            avatar_url=msg.author.avatar_url if msg.author else None,
        ),
        created_at=msg.created_at.isoformat() if msg.created_at else None,
        is_self=(msg.user_id == current_user_id),
    )


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/", response_model=list[ChannelResponse])
def list_channels(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company_id = _get_company_id(db, current_user.id)
    _ensure_defaults(db, company_id, current_user.id)
    channels = (
        db.query(Channel)
        .filter(Channel.company_id == company_id)
        .order_by(Channel.created_at.asc())
        .all()
    )
    return [_to_channel_response(ch, db) for ch in channels]


@router.post("/", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
def create_channel(
    body: ChannelCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company_id = _get_company_id(db, current_user.id)
    existing = db.query(Channel).filter(
        Channel.company_id == company_id, Channel.name == body.name.strip()
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Channel name already exists")

    ch = Channel(
        company_id=company_id,
        name=body.name.strip(),
        type=body.type or "general",
        description=body.description,
        created_by=current_user.id,
    )
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return _to_channel_response(ch, db)


@router.get("/{channel_id}/messages", response_model=list[MessageResponse])
def get_messages(
    channel_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    after_id: Optional[int] = Query(None, description="Return only messages with id > after_id (for polling)"),
    limit: int = Query(50, le=100),
):
    company_id = _get_company_id(db, current_user.id)
    ch = db.query(Channel).filter(
        Channel.id == channel_id, Channel.company_id == company_id
    ).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")

    q = db.query(ChannelMessage).filter(ChannelMessage.channel_id == channel_id)
    if after_id:
        q = q.filter(ChannelMessage.id > after_id)
    msgs = q.order_by(ChannelMessage.created_at.asc()).limit(limit).all()
    return [_to_msg_response(m, current_user.id) for m in msgs]


@router.post("/{channel_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    channel_id: int,
    body: MessageCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company_id = _get_company_id(db, current_user.id)
    ch = db.query(Channel).filter(
        Channel.id == channel_id, Channel.company_id == company_id
    ).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    msg = ChannelMessage(
        channel_id=channel_id,
        user_id=current_user.id,
        content=body.content.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Reload with relationship for author info
    msg = db.query(ChannelMessage).filter(ChannelMessage.id == msg.id).first()
    response = _to_msg_response(msg, current_user.id)

    # Broadcast chat:message to all online company members via WebSocket
    try:
        from routers.calls import call_manager
        member_ids = [
            m.user_id
            for m in db.query(CompanyMember).filter(CompanyMember.company_id == company_id).all()
        ]
        author_name = response.author.name
        author_avatar = response.author.avatar_url
        ws_payload = {
            "type": "chat:message",
            "channel_id": channel_id,
            "message": {
                "id": response.id,
                "channel_id": channel_id,
                "user_id": response.user_id,
                "content": response.content,
                "author": {
                    "id": response.user_id,
                    "name": author_name,
                    "avatar_url": author_avatar,
                },
                "created_at": response.created_at,
                "is_self": False,  # receiver side; sender handles optimistic UI
            },
        }
        await call_manager.broadcast_to_users(member_ids, ws_payload)
    except Exception:
        pass  # WS broadcast is best-effort; HTTP response always succeeds

    return response


@router.delete("/{channel_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    channel_id: int,
    message_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _get_company_id(db, current_user.id)
    msg = db.query(ChannelMessage).filter(
        ChannelMessage.id == message_id,
        ChannelMessage.channel_id == channel_id,
        ChannelMessage.user_id == current_user.id,
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found or no permission")
    db.delete(msg)
    db.commit()


@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_channel(
    channel_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    company_id = _get_company_id(db, current_user.id)
    ch = db.query(Channel).filter(
        Channel.id == channel_id,
        Channel.company_id == company_id,
        Channel.created_by == current_user.id,
    ).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Not found or no permission")
    db.delete(ch)
    db.commit()
