"""Billing router — subscription management & history"""
from __future__ import annotations
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from auth import get_current_user
from admin_access import user_is_admin
from database import get_db
from models import User, BillingEvent, Subscription, CompanyMember
from billing_engine import compute_billing_status, process_all_subscriptions

router = APIRouter(prefix="/billing", tags=["billing"])


def _get_my_company_id(db: Session, user_id: int) -> Optional[int]:
    m = db.query(CompanyMember).filter(CompanyMember.user_id == user_id).first()
    return m.company_id if m else None


class BillingStatusOut(BaseModel):
    effective_status: str
    days_remaining: int
    plan_id: Optional[str] = None
    period_end: Optional[str] = None
    dunning_step: int = 0


class BillingEventOut(BaseModel):
    id: int
    event_type: str
    description: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/status", response_model=BillingStatusOut)
def get_billing_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company_id = _get_my_company_id(db, current_user.id)
    if not company_id:
        raise HTTPException(status_code=404, detail="No company")
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).order_by(Subscription.id.desc()).first()
    if not sub:
        return BillingStatusOut(effective_status="none", days_remaining=0)
    billing = compute_billing_status(sub)
    period_end = sub.current_period_end or sub.trial_end
    return BillingStatusOut(
        effective_status=billing["effective_status"],
        days_remaining=billing["days_remaining"],
        plan_id=sub.plan_id,
        period_end=period_end.isoformat() if period_end else None,
        dunning_step=sub.dunning_step or 0,
    )


@router.get("/history", response_model=List[BillingEventOut])
def get_billing_history(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company_id = _get_my_company_id(db, current_user.id)
    if not company_id:
        raise HTTPException(status_code=404, detail="No company")
    member = db.query(CompanyMember).filter(
        CompanyMember.user_id == current_user.id,
        CompanyMember.company_id == company_id,
        CompanyMember.role.in_(["owner", "admin"]),
    ).first()
    if not member and not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Owner/admin only")
    events = db.query(BillingEvent).filter(
        BillingEvent.company_id == company_id
    ).order_by(BillingEvent.created_at.desc()).limit(50).all()
    return [BillingEventOut(
        id=e.id, event_type=e.event_type, description=e.description,
        created_at=e.created_at.isoformat() if e.created_at else None,
    ) for e in events]


@router.post("/run-check")
def run_billing_check(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    dry_run: bool = False,
):
    """Admin-only: trigger dunning/lifecycle check across all subscriptions."""
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only")
    results = process_all_subscriptions(db, dry_run=dry_run)
    return {"processed": len(results), "results": results}
