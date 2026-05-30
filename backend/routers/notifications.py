from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from database import get_db
from models import User, Notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Notification types that belong exclusively to CallsPanel — never shown in main feed
_CALL_TYPES = {"call_incoming", "call_missed", "call_ended", "call_rejected"}


def _base_query(db: Session, user_id: int):
    """Shared base: live (not expired) + not call-type."""
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            # Exclude call notifications — they live only in CallsPanel
            Notification.type.notin_(_CALL_TYPES),
            # Exclude expired notifications
            or_(
                Notification.expires_at.is_(None),
                Notification.expires_at > func.now(),
            ),
        )
    )


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    body: Optional[str] = None
    read: bool = False
    reference_id: Optional[str] = None
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_avatar: Optional[str] = None
    created_at: Optional[str] = None


class UnreadCount(BaseModel):
    count: int


@router.get("/", response_model=list[NotificationResponse])
def list_notifications(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(50, ge=1, le=100),
):
    notifs = (
        _base_query(db, current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        NotificationResponse(
            id=n.id,
            type=n.type,
            title=n.title,
            body=n.body,
            read=bool(n.read),
            reference_id=n.reference_id,
            actor_id=n.actor_id,
            actor_name=n.actor.name if n.actor else None,
            actor_avatar=n.actor.avatar_url if n.actor else None,
            created_at=n.created_at.isoformat() if n.created_at else None,
        )
        for n in notifs
    ]


@router.get("/unread-count", response_model=UnreadCount)
def unread_count(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    count = (
        _base_query(db, current_user.id)
        .filter(Notification.read == 0)
        .count()
    )
    return UnreadCount(count=count)


@router.patch("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(
    notification_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = 1
    db.commit()


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Mark only main-feed notifications (not call types, not expired)
    _base_query(db, current_user.id).filter(Notification.read == 0).update(
        {"read": 1}, synchronize_session=False
    )
    db.commit()


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()


# ─── Daily cleanup loop ────────────────────────────────────────────────────────

async def _cleanup_loop() -> None:
    """Background loop: delete expired notifications once per day at 03:00 UTC."""
    logger.info("Notification cleanup loop started.")
    while True:
        try:
            now = datetime.now(timezone.utc)
            # Sleep until next 03:00 UTC
            next_run = now.replace(hour=3, minute=0, second=0, microsecond=0)
            if next_run <= now:
                from datetime import timedelta
                next_run = next_run + timedelta(days=1)
            wait_secs = (next_run - now).total_seconds()
            await asyncio.sleep(wait_secs)

            from database import SessionLocal
            db = SessionLocal()
            try:
                deleted = (
                    db.query(Notification)
                    .filter(
                        Notification.expires_at.isnot(None),
                        Notification.expires_at <= func.now(),
                    )
                    .delete(synchronize_session=False)
                )
                db.commit()
                logger.info(f"Notification cleanup: deleted {deleted} expired rows.")
            except Exception as e:
                logger.error(f"Notification cleanup DB error: {e}")
                db.rollback()
            finally:
                db.close()

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Notification cleanup loop error: {e}")
            await asyncio.sleep(3600)  # retry in 1h on unexpected error


async def start_cleanup_loop() -> None:
    asyncio.create_task(_cleanup_loop())
