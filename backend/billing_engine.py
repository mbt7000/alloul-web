"""
ALLOUL&Q Billing Engine
Handles subscription lifecycle: grace → suspended → frozen → scheduled_deletion → deleted
"""
from __future__ import annotations
import json
import os
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

# ── Timeline constants ────────────────────────────────────────────────────────
GRACE_DAYS             = 10
SUSPENDED_DAYS         = 3
FROZEN_DAYS            = 30
SCHEDULED_DELETE_DAYS  = 15
# Total = 10 + 3 + 30 + 15 = 58 days from period_end before deletion

DUNNING_SCHEDULE = [1, 3, 7, 10]   # days from period_end to send each email

RESEND_API_KEY   = os.getenv("RESEND_API_KEY", "")
RESEND_FROM      = os.getenv("RESEND_FROM_EMAIL", "noreply@alloul.app")
APP_URL          = os.getenv("APP_URL", "https://alloul.app")


# ── Status computation ────────────────────────────────────────────────────────

def compute_billing_status(sub) -> dict:
    """
    Returns:
      effective_status: active|trialing|grace|suspended|frozen|scheduled_deletion|deleted|canceled
      days_remaining:   days left in current phase
      dunning_day:      days since period ended (only in grace)
    """
    now = datetime.now(timezone.utc)

    if not sub or sub.status == "canceled":
        return {"effective_status": "canceled", "days_remaining": 0, "dunning_day": 0}

    period_end = sub.current_period_end or sub.trial_end
    if not period_end:
        return {"effective_status": sub.status or "none", "days_remaining": 0, "dunning_day": 0}

    if period_end.tzinfo is None:
        period_end = period_end.replace(tzinfo=timezone.utc)

    # Still within paid window
    if now <= period_end:
        raw = sub.status if sub.status in ("active", "trialing") else "active"
        return {"effective_status": raw, "days_remaining": (period_end - now).days, "dunning_day": 0}

    days = (now - period_end).days  # days overdue

    if days <= GRACE_DAYS:
        return {"effective_status": "grace",
                "days_remaining": GRACE_DAYS - days,
                "dunning_day": days}

    days_after_grace = days - GRACE_DAYS

    if days_after_grace <= SUSPENDED_DAYS:
        return {"effective_status": "suspended",
                "days_remaining": SUSPENDED_DAYS - days_after_grace,
                "dunning_day": days}

    days_after_suspended = days_after_grace - SUSPENDED_DAYS

    if days_after_suspended <= FROZEN_DAYS:
        return {"effective_status": "frozen",
                "days_remaining": FROZEN_DAYS - days_after_suspended,
                "dunning_day": days}

    days_after_frozen = days_after_suspended - FROZEN_DAYS

    if days_after_frozen <= SCHEDULED_DELETE_DAYS:
        return {"effective_status": "scheduled_deletion",
                "days_remaining": SCHEDULED_DELETE_DAYS - days_after_frozen,
                "dunning_day": days}

    return {"effective_status": "deleted", "days_remaining": 0, "dunning_day": days}


# ── Email sending (Resend) ────────────────────────────────────────────────────

def _send_email(to: str, subject: str, html: str) -> bool:
    if not RESEND_API_KEY or not to:
        return False
    try:
        r = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": f"ALLOUL&Q <{RESEND_FROM}>", "to": [to], "subject": subject, "html": html},
            timeout=10,
        )
        return r.status_code in (200, 201)
    except Exception:
        return False


def _base_html(title: str, body: str, cta_url: str, cta_label: str, color: str = "#2E8BFF") -> str:
    return f"""
<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title></head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:Arial,sans-serif;direction:rtl">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1F2937">
  <tr><td style="background:linear-gradient(135deg,#0D1220,#111827);padding:32px 40px;text-align:center">
    <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px">ALLOUL<span style="color:{color}">&Q</span></div>
  </td></tr>
  <tr><td style="padding:32px 40px">
    <h1 style="margin:0 0 16px;color:#fff;font-size:22px;font-weight:900">{title}</h1>
    <div style="color:#9CA3AF;font-size:15px;line-height:1.7">{body}</div>
    <div style="margin:28px 0;text-align:center">
      <a href="{cta_url}" style="background:linear-gradient(90deg,{color},#00D4FF);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:900;font-size:15px;display:inline-block">{cta_label}</a>
    </div>
    <p style="color:#4B5563;font-size:12px;text-align:center;margin:0">ALLOUL&amp;Q · منصة إدارة الأعمال العربية</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>"""


EMAIL_TEMPLATES = {
    "dunning_1": lambda co, days: (
        f"تذكير: اشتراك شركة {co} انتهى",
        _base_html(
            f"اشتراك {co} انتهى",
            f"نُذكّرك بأن اشتراك شركتك على منصة ALLOUL&Q قد انتهى.<br><br>"
            f"لديك <strong style='color:#FFB24D'>{days} أيام</strong> لتجديد الاشتراك قبل إيقاف الخدمة.<br><br>"
            f"جميع بياناتك وبيانات فريقك محفوظة وآمنة.",
            f"{APP_URL}/subscribe",
            "جدّد اشتراكك الآن",
            "#FFB24D"
        )
    ),
    "dunning_2": lambda co, days: (
        f"تذكير عاجل: اشتراك {co} — {days} أيام متبقية",
        _base_html(
            f"⚠️ {days} أيام فقط لتجديد اشتراكك",
            f"اشتراك شركة <strong style='color:#fff'>{co}</strong> على ALLOUL&Q لا يزال غير مُجدَّد.<br><br>"
            f"<strong style='color:#EF4444'>تبقّى {days} أيام</strong> قبل إيقاف الخدمة عن الشركة وجميع أعضاء الفريق.",
            f"{APP_URL}/subscribe",
            "جدّد الاشتراك قبل الإيقاف",
            "#EF4444"
        )
    ),
    "dunning_3": lambda co, days: (
        f"تحذير: {days} أيام متبقية قبل إيقاف خدمة {co}",
        _base_html(
            f"🚨 {days} أيام حتى إيقاف الخدمة",
            f"ستُوقف خدمة شركة <strong style='color:#fff'>{co}</strong> خلال <strong style='color:#EF4444'>{days} أيام</strong>.<br><br>"
            f"بعد الإيقاف، لن يتمكن أنت وأعضاء فريقك من الوصول لمساحة العمل.",
            f"{APP_URL}/subscribe",
            "تجنّب الإيقاف — جدّد الآن",
            "#EF4444"
        )
    ),
    "dunning_4": lambda co, _: (
        f"آخر تحذير: سيتم إيقاف خدمة {co} اليوم",
        _base_html(
            "⛔ آخر تحذير — الإيقاف اليوم",
            f"هذا آخر تحذير قبل إيقاف خدمة شركة <strong style='color:#fff'>{co}</strong>.<br><br>"
            f"اليوم هو آخر يوم في فترة السماح. بعده سيُحجب وصول الشركة وجميع أعضاء الفريق.",
            f"{APP_URL}/subscribe",
            "ادفع الآن وتجنّب الإيقاف",
            "#EF4444"
        )
    ),
    "suspended": lambda co, days: (
        f"تم إيقاف خدمة {co} مؤقتاً",
        _base_html(
            "⚠️ تم إيقاف خدمتك مؤقتاً",
            f"تم إيقاف وصول شركة <strong style='color:#fff'>{co}</strong> إلى ALLOUL&Q.<br><br>"
            f"لديك <strong style='color:#EF4444'>{days} أيام</strong> لدفع الاشتراك وإستعادة الوصول الكامل لك ولفريقك.<br><br>"
            f"بياناتك محفوظة وستُستعاد فور الدفع.",
            f"{APP_URL}/subscribe?reason=suspended&days={days}",
            f"استعد الوصول خلال {days} أيام",
            "#EF4444"
        )
    ),
    "frozen": lambda co, days: (
        f"بيانات {co} محفوظة — {days} يوماً للإحياء",
        _base_html(
            "❄️ حسابك مجمّد — بياناتك آمنة",
            f"تم تجميد حساب شركة <strong style='color:#fff'>{co}</strong>.<br><br>"
            f"بياناتك وبيانات فريقك <strong style='color:#14E0A4'>محفوظة بأمان</strong> لمدة <strong>{days} يوماً</strong>.<br><br>"
            f"ادفع الاشتراك في أي وقت خلال هذه المدة لإحياء حسابك فوراً دون أي فقدان للبيانات.",
            f"{APP_URL}/subscribe?reason=frozen",
            "أحيِ حسابك الآن",
            "#A78BFA"
        )
    ),
    "scheduled_deletion": lambda co, days: (
        f"تحذير: بيانات {co} ستُحذف خلال {days} أيام",
        _base_html(
            f"🗑️ بياناتك ستُحذف خلال {days} أيام",
            f"<strong style='color:#EF4444'>تنبيه مهم:</strong> ستُحذف بيانات شركة <strong style='color:#fff'>{co}</strong> نهائياً خلال <strong style='color:#EF4444'>{days} أيام</strong>.<br><br>"
            f"بعد الحذف لا يمكن استرجاع البيانات.<br><br>"
            f"ادفع الاشتراك الآن للحفاظ على كل بياناتك وإحياء حسابك.",
            f"{APP_URL}/subscribe?reason=scheduled_deletion&days={days}",
            f"احفظ بياناتك — {days} أيام فقط",
            "#EF4444"
        )
    ),
    "member_suspended": lambda co, _: (
        f"تم إيقاف وصولك لـ {co} مؤقتاً",
        _base_html(
            "وصولك لمساحة العمل مُعلَّق",
            f"تم إيقاف وصول شركة <strong style='color:#fff'>{co}</strong> مؤقتاً بسبب مسألة في الاشتراك.<br><br>"
            f"تواصل مع مسؤول الشركة لإعادة تفعيل الخدمة.<br><br>"
            f"بياناتك محفوظة وستعود للعمل فور تجديد الاشتراك.",
            f"{APP_URL}",
            "تواصل مع مسؤول شركتك",
            "#FFB24D"
        )
    ),
}


# ── Dunning & lifecycle engine ────────────────────────────────────────────────

def process_subscription(sub, db, dry_run: bool = False) -> list[str]:
    """
    Check one subscription, send emails, update status, log events.
    Returns list of actions taken.
    """
    from models import BillingEvent, Notification, CompanyMember, User
    actions = []
    now = datetime.now(timezone.utc)
    billing = compute_billing_status(sub)
    effective = billing["effective_status"]
    days_remaining = billing["days_remaining"]
    dunning_day = billing["dunning_day"]

    company = sub.company
    if not company:
        return actions

    company_name = company.name
    # Get owner email
    owner_member = db.query(CompanyMember).filter(
        CompanyMember.company_id == company.id,
        CompanyMember.role == "owner"
    ).first()
    owner_user = db.query(User).filter(User.id == owner_member.user_id).first() if owner_member else None
    owner_email = owner_user.email if owner_user else None

    def log_event(event_type: str, description: str, extra: dict = None):
        if dry_run:
            return
        ev = BillingEvent(
            company_id=company.id,
            event_type=event_type,
            description=description,
            extra=json.dumps(extra or {}),
        )
        db.add(ev)

    def notify_owner(title: str, body: str, ref: str = "billing"):
        if dry_run or not owner_member:
            return
        n = Notification(user_id=owner_member.user_id, type="system", title=title, body=body, reference_id=ref)
        db.add(n)

    def notify_all_members(title: str, body: str, ref: str = "billing"):
        if dry_run:
            return
        members = db.query(CompanyMember).filter(CompanyMember.company_id == company.id).all()
        for m in members:
            n = Notification(user_id=m.user_id, type="system", title=title, body=body, reference_id=ref)
            db.add(n)

    # ── Grace: dunning emails ──────────────────────────────────────────────
    if effective == "grace":
        step = sub.dunning_step or 0
        for i, target_day in enumerate(DUNNING_SCHEDULE):
            if dunning_day >= target_day and step <= i:
                template_key = f"dunning_{i+1}"
                tmpl = EMAIL_TEMPLATES.get(template_key)
                if tmpl:
                    subject, html = tmpl(company_name, days_remaining)
                    sent = _send_email(owner_email, subject, html) if not dry_run else True
                    actions.append(f"dunning_email_{i+1} day={dunning_day} sent={sent}")
                    log_event(f"dunning_{i+1}", f"Dunning email #{i+1} sent to {owner_email}", {"day": dunning_day})
                    notify_owner(
                        f"تذكير اشتراك — {days_remaining} أيام متبقية",
                        f"اشتراكك انتهى. تبقّى {days_remaining} أيام قبل إيقاف الخدمة.",
                        f"billing:dunning_{i+1}"
                    )
                    if not dry_run:
                        sub.dunning_step = i + 1
                        sub.dunning_last_sent = now
                    break

    # ── Suspended: notify on first entry ──────────────────────────────────
    elif effective == "suspended":
        if sub.status != "suspended":
            subject, html = EMAIL_TEMPLATES["suspended"](company_name, days_remaining)
            sent = _send_email(owner_email, subject, html) if not dry_run else True
            actions.append(f"suspension_email sent={sent}")
            log_event("status_change", f"Status → suspended. {days_remaining} days to pay.", {"prev": sub.status})
            notify_all_members(
                "⚠️ تم إيقاف الخدمة مؤقتاً",
                f"تم إيقاف وصول شركتك. تواصل مع مسؤول الشركة لتجديد الاشتراك. لديكم {days_remaining} أيام.",
                "billing:suspended"
            )
            # Notify members separately (different message)
            members = db.query(CompanyMember).filter(
                CompanyMember.company_id == company.id,
                CompanyMember.role != "owner"
            ).all()
            for m in members:
                mu = db.query(User).filter(User.id == m.user_id).first()
                if mu and mu.email:
                    ms, mh = EMAIL_TEMPLATES["member_suspended"](company_name, days_remaining)
                    if not dry_run:
                        _send_email(mu.email, ms, mh)
            if not dry_run:
                sub.status = "suspended"

    # ── Frozen: notify on first entry + weekly reminder ───────────────────
    elif effective == "frozen":
        if sub.status != "frozen":
            subject, html = EMAIL_TEMPLATES["frozen"](company_name, days_remaining)
            sent = _send_email(owner_email, subject, html) if not dry_run else True
            actions.append(f"frozen_email sent={sent}")
            log_event("status_change", f"Status → frozen. {days_remaining} days to reactivate.", {"prev": sub.status})
            notify_owner("❄️ حسابك مجمّد", f"بياناتك محفوظة {days_remaining} يوماً. ادفع لإحياء حسابك.", "billing:frozen")
            if not dry_run:
                sub.status = "frozen"
                sub.frozen_at = now
        else:
            # Weekly reminder during frozen
            last = sub.dunning_last_sent
            if not last or (now - last.replace(tzinfo=timezone.utc)).days >= 7:
                subject, html = EMAIL_TEMPLATES["frozen"](company_name, days_remaining)
                if not dry_run:
                    _send_email(owner_email, subject, html)
                    sub.dunning_last_sent = now
                actions.append(f"frozen_weekly_reminder days_left={days_remaining}")
                log_event("dunning_frozen", f"Frozen weekly reminder. {days_remaining} days left.")

    # ── Scheduled deletion: notify on first entry + every 5 days ─────────
    elif effective == "scheduled_deletion":
        if sub.status != "scheduled_deletion":
            subject, html = EMAIL_TEMPLATES["scheduled_deletion"](company_name, days_remaining)
            sent = _send_email(owner_email, subject, html) if not dry_run else True
            actions.append(f"scheduled_deletion_email sent={sent}")
            log_event("status_change", f"Status → scheduled_deletion. {days_remaining} days.", {"prev": sub.status})
            notify_owner("🗑️ بياناتك ستُحذف قريباً", f"بياناتك ستُحذف خلال {days_remaining} يوماً.", "billing:scheduled_deletion")
            if not dry_run:
                sub.status = "scheduled_deletion"
                sub.deletion_scheduled_at = now + timedelta(days=days_remaining)
        else:
            last = sub.dunning_last_sent
            if not last or (now - last.replace(tzinfo=timezone.utc)).days >= 5:
                subject, html = EMAIL_TEMPLATES["scheduled_deletion"](company_name, days_remaining)
                if not dry_run:
                    _send_email(owner_email, subject, html)
                    sub.dunning_last_sent = now
                actions.append(f"deletion_reminder days_left={days_remaining}")

    # ── Deleted: wipe company data ────────────────────────────────────────
    elif effective == "deleted" and sub.status != "deleted":
        if not dry_run:
            _wipe_company_data(company.id, db)
            sub.status = "deleted"
        actions.append("data_wiped")
        log_event("data_deleted", "Company data wiped after billing expiry.")

    if not dry_run:
        try:
            db.commit()
        except Exception:
            db.rollback()

    return actions


def _wipe_company_data(company_id: int, db):
    """Delete operational data but keep company + user account shells."""
    from models import (
        CompanyMember, Department, ActivityLog, JobPosting, JobApplication,
        BillingEvent
    )
    # Soft wipe: delete operational records, keep company + members shell
    for Model in [JobApplication, JobPosting, ActivityLog, Department]:
        try:
            db.query(Model).filter(Model.company_id == company_id).delete(synchronize_session=False)
        except Exception:
            pass


def process_all_subscriptions(db, dry_run: bool = False) -> dict:
    """Run billing engine across all subscriptions. Call from cron or admin endpoint."""
    from models import Subscription
    subs = db.query(Subscription).filter(
        Subscription.status.notin_(["canceled", "deleted"])
    ).all()
    results = {}
    for sub in subs:
        try:
            actions = process_subscription(sub, db, dry_run=dry_run)
            if actions:
                results[sub.company_id] = actions
        except Exception as e:
            results[f"error_{sub.company_id}"] = str(e)
    return results
