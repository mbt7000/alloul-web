from __future__ import annotations

from typing import Optional

import stripe
from fastapi import APIRouter, Request, HTTPException, Header, status
from datetime import datetime, timezone

from config import settings
from database import SessionLocal
from models import Subscription

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Webhook secret not configured")
    if settings.STRIPE_SECRET_KEY:
        stripe.api_key = settings.STRIPE_SECRET_KEY
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature or "", settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    db = SessionLocal()
    try:
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            if session.get("mode") == "subscription" and session.get("subscription"):
                sub_id = session["subscription"]
                company_id = session.get("metadata", {}).get("company_id")
                if company_id:
                    sub_record = db.query(Subscription).filter(
                        Subscription.company_id == int(company_id)
                    ).order_by(Subscription.id.desc()).first()
                    if sub_record:
                        sub_record.stripe_subscription_id = sub_id
                        sub_record.plan_id = session.get("metadata", {}).get("plan_id") or sub_record.plan_id
                        sub_record.status = "active"
                        db.commit()
                        if settings.STRIPE_SECRET_KEY:
                            stripe.api_key = settings.STRIPE_SECRET_KEY
                            s = stripe.Subscription.retrieve(sub_id)
                            sub_record.status = s.get("status", "active")
                            if s.get("trial_end"):
                                sub_record.trial_end = datetime.fromtimestamp(s["trial_end"], tz=timezone.utc)
                            if s.get("current_period_end"):
                                sub_record.current_period_end = datetime.fromtimestamp(s["current_period_end"], tz=timezone.utc)
                            if s.get("current_period_start"):
                                sub_record.current_period_start = datetime.fromtimestamp(s["current_period_start"], tz=timezone.utc)
                            db.commit()

        elif event["type"] == "customer.subscription.updated":
            sub = event["data"]["object"]
            sub_record = db.query(Subscription).filter(
                Subscription.stripe_subscription_id == sub["id"]
            ).first()
            if sub_record:
                sub_record.status = sub.get("status")
                if sub.get("trial_end"):
                    sub_record.trial_end = datetime.fromtimestamp(sub["trial_end"], tz=timezone.utc)
                if sub.get("current_period_end"):
                    sub_record.current_period_end = datetime.fromtimestamp(sub["current_period_end"], tz=timezone.utc)
                if sub.get("current_period_start"):
                    sub_record.current_period_start = datetime.fromtimestamp(sub["current_period_start"], tz=timezone.utc)
                sub_record.cancel_at_period_end = 1 if sub.get("cancel_at_period_end") else 0
                db.commit()

        elif event["type"] == "customer.subscription.deleted":
            sub = event["data"]["object"]
            sub_record = db.query(Subscription).filter(
                Subscription.stripe_subscription_id == sub["id"]
            ).first()
            if sub_record:
                sub_record.status = "canceled"
                db.commit()

        elif event["type"] == "invoice.payment_succeeded":
            inv = event["data"]["object"]
            sub_id = inv.get("subscription")
            if sub_id:
                sub_record = db.query(Subscription).filter(
                    Subscription.stripe_subscription_id == sub_id
                ).first()
                if sub_record and settings.STRIPE_SECRET_KEY:
                    stripe.api_key = settings.STRIPE_SECRET_KEY
                    s = stripe.Subscription.retrieve(sub_id)
                    sub_record.status = s.get("status", "active")
                    if s.get("current_period_end"):
                        sub_record.current_period_end = datetime.fromtimestamp(s["current_period_end"], tz=timezone.utc)
                    if s.get("current_period_start"):
                        sub_record.current_period_start = datetime.fromtimestamp(s["current_period_start"], tz=timezone.utc)
                    sub_record.dunning_step = 0
                    sub_record.dunning_last_sent = None
                    db.commit()

        elif event["type"] == "invoice.payment_failed":
            inv = event["data"]["object"]
            sub_id = inv.get("subscription")
            if sub_id:
                sub_record = db.query(Subscription).filter(
                    Subscription.stripe_subscription_id == sub_id
                ).first()
                if sub_record:
                    sub_record.status = "past_due"
                    db.commit()
    finally:
        db.close()

    return {"received": True}
