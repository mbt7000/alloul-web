from __future__ import annotations

import random
import string
from typing import Annotated, Optional

from routers.employees import generate_work_id

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from admin_access import user_is_admin
from database import get_db
from models import User, Company, Subscription, Department, CompanyMember, ActivityLog, CompanyInvitation, EmailInvitation, Notification, CompanyOnboarding, JoinRequest
from schemas_company import (
    CompanyCreate,
    CompanyResponse,
    CompanyUpdate,
    SubscribeRequest,
    SubscribeResponse,
    SubscriptionStatusResponse,
    DepartmentCreate,
    DepartmentResponse,
    CompanyMemberCreate,
    CompanyMemberResponse,
    ActivityLogResponse,
    CompanyStatsResponse,
    MyRoleResponse,
    InviteLinkResponse,
    OnboardingStatusResponse,
    PendingInvitationResponse,
    EmailInviteRequest,
    EmailInviteInfoResponse,
    AcceptEmailInviteRequest,
    AcceptEmailInviteResponse,
)

router = APIRouter(prefix="/companies", tags=["companies"])


def _member_phone_for_user(db: Session, user_id: int) -> Optional[str]:
    u = db.query(User).filter(User.id == user_id).first()
    if not u or not getattr(u, "phone", None):
        return None
    p = u.phone.strip() if isinstance(u.phone, str) else None
    return p or None


def _member_info_for_user(db: Session, user_id: int) -> tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """Returns (name, email, phone, avatar_url) for a user."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        return None, None, None, None
    name = u.name or u.username or None
    email = u.email or None
    phone = (u.phone.strip() if isinstance(u.phone, str) else None) or None
    avatar_url = getattr(u, "avatar_url", None)
    return name, email, phone, avatar_url


def _generate_icode(length: int = 8) -> str:
    return "".join(random.choices(string.digits, k=length))


def _get_my_company(db: Session, user_id: int) -> Optional[Company]:
    member = db.query(CompanyMember).filter(
        CompanyMember.user_id == user_id
    ).first()
    if not member:
        return None
    return db.query(Company).filter(Company.id == member.company_id).first()


def _get_my_membership(db: Session, user_id: int, company_id: int) -> Optional[CompanyMember]:
    return db.query(CompanyMember).filter(
        CompanyMember.user_id == user_id,
        CompanyMember.company_id == company_id,
    ).first()


def _log_activity(db: Session, company_id: int, user_id: Optional[int], action: str, details: Optional[str] = None):
    log = ActivityLog(company_id=company_id, user_id=user_id, action=action, details=details)
    db.add(log)
    db.commit()


MAX_EMPLOYEES = {"starter": 5, "pro": 25, "business": 100, "pro_plus": 100}

# ── Grace / Suspension constants ────────────────────────────────────────────
GRACE_DAYS     = 10   # access allowed but warning shown
SUSPENDED_DAYS = 3    # no access, lobby shown — can still pay to restore
# After GRACE_DAYS + SUSPENDED_DAYS the company moves to 'expired'


def _compute_billing_status(sub: "Subscription") -> dict:
    """
    Always compute the real-time effective status from period_end dates.
    Stored status is just a cache — we recalculate to catch transitions.
    """
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    raw = sub.status if sub else None

    # Permanently canceled — no path back through dates
    if raw == "canceled":
        return {"effective_status": "canceled", "days_remaining": 0}

    # Use period_end as the authoritative clock
    period_end = sub.current_period_end or sub.trial_end
    if not period_end:
        # No date stored → trust stored status
        return {"effective_status": raw or "none", "days_remaining": 0}
    if period_end.tzinfo is None:
        period_end = period_end.replace(tzinfo=timezone.utc)

    if now <= period_end:
        # Still within paid/trial window
        effective = raw if raw in ("active", "trialing") else "active"
        return {"effective_status": effective, "days_remaining": (period_end - now).days}

    days_overdue = (now - period_end).days

    if days_overdue <= GRACE_DAYS:
        return {"effective_status": "grace",     "days_remaining": GRACE_DAYS - days_overdue}
    elif days_overdue <= GRACE_DAYS + SUSPENDED_DAYS:
        return {"effective_status": "suspended", "days_remaining": (GRACE_DAYS + SUSPENDED_DAYS) - days_overdue}
    else:
        return {"effective_status": "expired",   "days_remaining": 0}


def _sync_sub_status(sub: "Subscription", billing: dict, db: Session, company_id: int):
    """
    Persist status changes and fire notifications on first transition.
    Called lazily whenever subscription_status endpoint is hit.
    """
    from datetime import datetime, timezone
    effective = billing["effective_status"]
    if sub.status == effective:
        return  # no change

    prev = sub.status
    sub.status = effective
    sub.updated_at = datetime.now(timezone.utc)
    db.add(sub)

    # Notify all company members on key transitions
    if effective in ("grace", "suspended", "expired") and prev != effective:
        members = db.query(CompanyMember).filter(CompanyMember.company_id == company_id).all()
        msgs = {
            "grace": ("تنبيه اشتراك", f"لديك {billing['days_remaining']} أيام لتجديد اشتراك شركتك قبل إيقاف الخدمة."),
            "suspended": ("⚠️ تم إيقاف خدمتك مؤقتاً", f"انتهت فترة السماح. لديك {billing['days_remaining']} أيام لدفع الاشتراك وإستعادة الوصول."),
            "expired": ("اشتراكك منتهٍ", "انتهت مهلة الدفع. تواصل مع الدعم لإعادة تفعيل شركتك."),
        }
        title, body = msgs.get(effective, ("اشتراك", ""))
        for m in members:
            n = Notification(
                user_id=m.user_id,
                type="system",
                title=title,
                body=body,
                reference_id=f"billing:{effective}",
            )
            db.add(n)

    db.commit()


def _require_active_subscription(
    db: Session,
    company_id: int,
    *,
    current_user: Optional[User] = None,
) -> Subscription:
    sub = (
        db.query(Subscription)
        .filter(Subscription.company_id == company_id)
        .order_by(Subscription.id.desc())
        .first()
    )
    if current_user and user_is_admin(current_user):
        if sub is not None:
            return sub

        class _AdminPlanBypass:
            plan_id = "business"
            status = "active"

        return _AdminPlanBypass()  # type: ignore[return-value]

    if not sub:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Active subscription required")

    billing = _compute_billing_status(sub)
    effective = billing["effective_status"]

    # grace = still allowed (with frontend warning)
    if effective in ("active", "trialing", "grace"):
        return sub

    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail=f"subscription:{effective}",
    )
    return sub


# ─── Company ─────────────────────────────────────────────────────────────────

@router.post("", response_model=CompanyResponse)
def create_company(
    body: CompanyCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if _get_my_company(db, current_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already have a company")
    # Unique 6-digit i_code for company
    for _ in range(50):
        i_code = _generate_icode(6)
        if not db.query(Company).filter(Company.i_code == i_code).first():
            break
    else:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate unique i_code")
    company = Company(
        name=body.name,
        company_type=body.company_type,
        size=body.size,
        founder_name=body.founder_name or current_user.name,
        founder_email=body.founder_email or current_user.email,
        logo_url=body.logo_url,
        i_code=i_code,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    # Add current user as admin; unique i_code for member
    for _ in range(50):
        mem_code = _generate_icode(6)
        if not db.query(CompanyMember).filter(CompanyMember.company_id == company.id, CompanyMember.i_code == mem_code).first():
            break
    else:
        mem_code = _generate_icode(6)
    member = CompanyMember(
        company_id=company.id,
        user_id=current_user.id,
        role="owner",
        i_code=mem_code,
        work_id=generate_work_id(db),
    )
    db.add(member)
    # Create onboarding tracker for the new company
    onboarding = CompanyOnboarding(company_id=company.id)
    db.add(onboarding)
    db.commit()
    _log_activity(db, company.id, current_user.id, "company_created", f"Company {company.name} created")
    return CompanyResponse(
        id=company.id,
        name=company.name,
        company_type=company.company_type,
        size=company.size,
        logo_url=company.logo_url,
        founder_name=company.founder_name,
        i_code=company.i_code,
        created_at=company.created_at.isoformat() if company.created_at else None,
    )


@router.get("/me", response_model=CompanyResponse)
def get_my_company(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company found")
    return CompanyResponse(
        id=company.id,
        name=company.name,
        company_type=company.company_type,
        size=company.size,
        logo_url=company.logo_url,
        founder_name=company.founder_name,
        i_code=company.i_code,
        created_at=company.created_at.isoformat() if company.created_at else None,
    )


@router.patch("/me", response_model=CompanyResponse)
def update_my_company(
    body: CompanyUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company found")
    if body.logo_url is not None:
        company.logo_url = body.logo_url
    db.commit()
    db.refresh(company)
    return CompanyResponse(
        id=company.id,
        name=company.name,
        company_type=company.company_type,
        size=company.size,
        logo_url=company.logo_url,
        founder_name=company.founder_name,
        i_code=company.i_code,
        created_at=company.created_at.isoformat() if company.created_at else None,
    )


# ─── Subscription (Stripe) ───────────────────────────────────────────────────

@router.get("/stripe-config")
def get_stripe_config(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return public Stripe config for the frontend."""
    from config import settings
    return {
        "publishable_key": settings.STRIPE_PUBLISHABLE_KEY or "",
        "plans": {
            "starter":  {"price_id": settings.STRIPE_PRICE_STARTER,   "amount": 3000,  "employees": 5},
            "pro":      {"price_id": settings.STRIPE_PRICE_PRO,        "amount": 9000,  "employees": 25},
            "business": {"price_id": settings.STRIPE_PRICE_BUSINESS,   "amount": 21000, "employees": 100},
            # legacy alias — kept for existing subscribers
            "pro_plus": {"price_id": settings.STRIPE_PRICE_BUSINESS,   "amount": 21000, "employees": 100},
        },
    }


def _get_stripe_price_id(plan_id: str):
    from config import settings
    m = {
        "starter":    settings.STRIPE_PRICE_STARTER,
        "pro":        settings.STRIPE_PRICE_PRO,
        "business":   settings.STRIPE_PRICE_BUSINESS,
        "pro_plus":   settings.STRIPE_PRICE_BUSINESS,   # legacy alias
        "enterprise": settings.STRIPE_PRICE_PRO_PLUS,   # maps to PRO_PLUS price
    }
    return m.get(plan_id)


@router.post("/subscribe", response_model=SubscribeResponse)
def subscribe(
    body: SubscribeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    import stripe
    from config import settings
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Create a company first")
    price_id = _get_stripe_price_id(body.plan_id)
    if not price_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid plan_id")
    # Get or create Stripe customer
    sub = db.query(Subscription).filter(Subscription.company_id == company.id).order_by(Subscription.id.desc()).first()
    customer_id = sub.stripe_customer_id if sub else None
    if not customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=company.name,
            metadata={"company_id": str(company.id)},
        )
        customer_id = customer.id
        if sub:
            sub.stripe_customer_id = customer_id
            db.commit()
        else:
            sub = Subscription(company_id=company.id, plan_id=body.plan_id, stripe_customer_id=customer_id)
            db.add(sub)
            db.commit()
    # Deep-link URLs: alloul://subscription-success and alloul://subscription-cancel
    # These open the mobile app directly after Stripe checkout
    success_url = "https://alloul.app/subscription-success?plan=" + body.plan_id + "&session_id={CHECKOUT_SESSION_ID}"
    cancel_url = "https://alloul.app/subscription-cancel"
    # Starter gets 7-day trial; other plans start immediately
    trial_days = 7 if body.plan_id == "starter" else None
    session_kwargs: dict = dict(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        payment_method_collection="always",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"company_id": str(company.id), "plan_id": body.plan_id},
    )
    if trial_days:
        session_kwargs["subscription_data"] = {"trial_period_days": trial_days}
    session = stripe.checkout.Session.create(**session_kwargs)
    return SubscribeResponse(checkout_url=session.url)


@router.post("/cancel-subscription")
def cancel_subscription(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    import stripe
    from config import settings
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company found")
    sub = db.query(Subscription).filter(Subscription.company_id == company.id).order_by(Subscription.id.desc()).first()
    if not sub or not sub.stripe_subscription_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active subscription")
    stripe.Subscription.modify(sub.stripe_subscription_id, cancel_at_period_end=True)
    sub.cancel_at_period_end = 1
    db.commit()
    _log_activity(db, company.id, current_user.id, "subscription_cancel_requested", "Cancel at period end")
    return {"message": "Subscription will cancel at end of billing period"}


@router.post("/billing-portal")
def create_billing_portal(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Owner only: create a Stripe Customer Portal session."""
    import stripe
    from config import settings
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company")
    sub = db.query(Subscription).filter(Subscription.company_id == company.id).order_by(Subscription.id.desc()).first()
    if not sub or not sub.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No Stripe customer — subscribe first")
    session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url="https://alloul.app/billing",
    )
    return {"portal_url": session.url}


@router.get("/subscription-status", response_model=SubscriptionStatusResponse)
def subscription_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        return SubscriptionStatusResponse(plan_id=None, status=None, effective_status="none", days_remaining=0)
    if user_is_admin(current_user):
        return SubscriptionStatusResponse(
            plan_id="admin", status="active", effective_status="active",
            days_remaining=9999, current_period_end=None, trial_end=None, cancel_at_period_end=False,
        )
    sub = db.query(Subscription).filter(Subscription.company_id == company.id).order_by(Subscription.id.desc()).first()
    if not sub:
        return SubscriptionStatusResponse(plan_id=None, status=None, effective_status="none", days_remaining=0)

    billing = _compute_billing_status(sub)
    # Lazily sync status transitions + fire notifications
    try:
        _sync_sub_status(sub, billing, db, company.id)
    except Exception:
        pass

    return SubscriptionStatusResponse(
        plan_id=sub.plan_id,
        status=sub.status,
        effective_status=billing["effective_status"],
        days_remaining=billing["days_remaining"],
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
        trial_end=sub.trial_end.isoformat() if sub.trial_end else None,
        cancel_at_period_end=bool(getattr(sub, "cancel_at_period_end", 0)),
    )


@router.post("/activate-trial")
def activate_trial(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Start a 14-day free trial for the owner's company. Idempotent."""
    from datetime import datetime, timezone, timedelta
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company found")
    existing = db.query(Subscription).filter(Subscription.company_id == company.id).order_by(Subscription.id.desc()).first()
    if existing and existing.status in ("active", "trialing"):
        return {"status": existing.status, "plan_id": existing.plan_id, "already_active": True}
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=14)
    sub = Subscription(
        company_id=company.id,
        plan_id="pro_trial",
        status="trialing",
        trial_end=trial_end,
        current_period_start=now,
        current_period_end=trial_end,
    )
    db.add(sub)
    db.commit()
    return {"status": "trialing", "plan_id": "pro_trial", "trial_end": trial_end.isoformat()}


# ─── Departments ──────────────────────────────────────────────────────────────

@router.get("/departments", response_model=list[DepartmentResponse])
def list_departments(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company found")
    depts = db.query(Department).filter(Department.company_id == company.id).all()
    return [DepartmentResponse(id=d.id, company_id=d.company_id, name=d.name) for d in depts]


@router.post("/departments", response_model=DepartmentResponse)
def create_department(
    body: DepartmentCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company found")
    _require_active_subscription(db, company.id, current_user=current_user)
    mem = _get_my_membership(db, current_user.id, company.id)
    if not mem or mem.role not in ("admin", "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or Manager required")
    dept = Department(company_id=company.id, name=body.name)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    _log_activity(db, company.id, current_user.id, "department_created", body.name)
    return DepartmentResponse(id=dept.id, company_id=dept.company_id, name=dept.name)


@router.patch("/departments/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: int,
    body: DepartmentCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company found")
    mem = _get_my_membership(db, current_user.id, company.id)
    if not mem or mem.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Admin or Manager required")
    dept = db.query(Department).filter(Department.id == dept_id, Department.company_id == company.id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    dept.name = body.name
    db.commit()
    db.refresh(dept)
    return DepartmentResponse(id=dept.id, company_id=dept.company_id, name=dept.name)


@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    dept_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company found")
    mem = _get_my_membership(db, current_user.id, company.id)
    if not mem or mem.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Admin or Manager required")
    dept = db.query(Department).filter(Department.id == dept_id, Department.company_id == company.id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()


# ─── Members / Org ───────────────────────────────────────────────────────────

@router.get("/members", response_model=list[CompanyMemberResponse])
def list_members(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company found")
    members = db.query(CompanyMember).filter(CompanyMember.company_id == company.id).all()
    result = []
    for m in members:
        name, email, phone, avatar_url = _member_info_for_user(db, m.user_id)
        member_user = db.query(User).filter(User.id == m.user_id).first()
        result.append(CompanyMemberResponse(
            id=m.id, company_id=m.company_id, user_id=m.user_id, role=m.role,
            department_id=m.department_id, i_code=m.i_code, manager_id=m.manager_id, job_title=m.job_title,
            phone=phone, user_name=name, user_email=email, avatar_url=avatar_url,
            presence_status=member_user.presence_status if member_user else "offline",
        ))
    return result


@router.post("/members", response_model=CompanyMemberResponse)
def add_member(
    body: CompanyMemberCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company found")
    sub = _require_active_subscription(db, company.id, current_user=current_user)
    current_count = db.query(CompanyMember).filter(CompanyMember.company_id == company.id).count()
    limit = MAX_EMPLOYEES.get(sub.plan_id, 0)
    if limit and current_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Employee limit ({limit}) reached for your plan. Upgrade to add more.",
        )
    if _get_my_membership(db, body.user_id, company.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already in company")
    mem = _get_my_membership(db, current_user.id, company.id)
    if not mem or mem.role not in ("admin", "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or Manager required")
    for _ in range(50):
        i_code = _generate_icode(6)
        if not db.query(CompanyMember).filter(CompanyMember.company_id == company.id, CompanyMember.i_code == i_code).first():
            break
    else:
        i_code = _generate_icode(6)
    new_mem = CompanyMember(
        company_id=company.id,
        user_id=body.user_id,
        role=body.role,
        department_id=body.department_id,
        manager_id=body.manager_id,
        job_title=body.job_title,
        i_code=i_code,
        work_id=generate_work_id(db),
    )
    db.add(new_mem)
    db.commit()
    db.refresh(new_mem)
    _log_activity(db, company.id, current_user.id, "member_added", f"user_id={body.user_id}")
    _n, _e, _p, _av = _member_info_for_user(db, new_mem.user_id)
    return CompanyMemberResponse(
        id=new_mem.id, company_id=new_mem.company_id, user_id=new_mem.user_id, role=new_mem.role,
        department_id=new_mem.department_id, i_code=new_mem.i_code, manager_id=new_mem.manager_id, job_title=new_mem.job_title,
        phone=_p, user_name=_n, user_email=_e, avatar_url=_av,
    )


@router.patch("/members/{member_id}", response_model=CompanyMemberResponse)
def update_member(
    member_id: int,
    body: CompanyMemberCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company found")
    mem = _get_my_membership(db, current_user.id, company.id)
    if not mem or mem.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Admin or Manager required")
    target = db.query(CompanyMember).filter(
        CompanyMember.id == member_id, CompanyMember.company_id == company.id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    if body.role:
        target.role = body.role
    if body.department_id is not None:
        target.department_id = body.department_id
    if body.job_title is not None:
        target.job_title = body.job_title
    if body.manager_id is not None:
        target.manager_id = body.manager_id
    db.commit()
    db.refresh(target)
    _n, _e, _p, _av = _member_info_for_user(db, target.user_id)
    return CompanyMemberResponse(
        id=target.id, company_id=target.company_id, user_id=target.user_id, role=target.role,
        department_id=target.department_id, i_code=target.i_code, manager_id=target.manager_id, job_title=target.job_title,
        phone=_p, user_name=_n, user_email=_e, avatar_url=_av,
    )


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    member_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company found")
    mem = _get_my_membership(db, current_user.id, company.id)
    if not mem or mem.role != "admin":
        raise HTTPException(status_code=403, detail="Admin required")
    target = db.query(CompanyMember).filter(
        CompanyMember.id == member_id, CompanyMember.company_id == company.id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    if target.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    db.delete(target)
    db.commit()
    _log_activity(db, company.id, current_user.id, "member_removed", f"member_id={member_id}")


# ─── Activity & Stats ───────────────────────────────────────────────────────

@router.get("/activity", response_model=list[ActivityLogResponse])
def list_activity(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = 50,
):
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company found")
    logs = db.query(ActivityLog).filter(ActivityLog.company_id == company.id).order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [
        ActivityLogResponse(
            id=l.id, company_id=l.company_id, user_id=l.user_id, action=l.action, details=l.details,
            created_at=l.created_at.isoformat() if l.created_at else "",
        )
        for l in logs
    ]


@router.get("/stats", response_model=CompanyStatsResponse)
def company_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No company found")
    total_members = db.query(CompanyMember).filter(CompanyMember.company_id == company.id).count()
    total_departments = db.query(Department).filter(Department.company_id == company.id).count()
    sub = db.query(Subscription).filter(Subscription.company_id == company.id).order_by(Subscription.id.desc()).first()
    plan_id = sub.plan_id if sub else None
    status_val = sub.status if sub else None
    max_employees = MAX_EMPLOYEES.get(plan_id or "") if plan_id else None
    return CompanyStatsResponse(
        total_members=total_members,
        total_departments=total_departments,
        plan_id=plan_id,
        subscription_status=status_val,
        max_employees=max_employees,
    )


# ─── Invitations ─────────────────────────────────────────────────────────────

class InviteRequest(BaseModel):
    i_code: str
    role: str = "member"

class InvitationResponse(BaseModel):
    id: int
    company_name: str
    inviter_name: Optional[str] = None
    status: str
    role: str
    created_at: Optional[str] = None

@router.post("/invite")
def send_invitation(
    body: InviteRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Send invitation by i_code. Only company admins/owners can invite."""
    membership = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not membership or membership.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="Only company admins can send invitations")

    company = db.query(Company).filter(Company.id == membership.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Find target user by i_code
    target = db.query(User).filter(User.i_code == body.i_code.strip()).first()
    if not target:
        raise HTTPException(status_code=404, detail="No user found with this I.code")

    # Check if already a member
    existing_member = db.query(CompanyMember).filter(
        CompanyMember.company_id == company.id, CompanyMember.user_id == target.id
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a member of this company")

    # Check if pending invitation exists
    existing_invite = db.query(CompanyInvitation).filter(
        CompanyInvitation.company_id == company.id,
        CompanyInvitation.invitee_id == target.id,
        CompanyInvitation.status == "pending",
    ).first()
    if existing_invite:
        raise HTTPException(status_code=400, detail="Invitation already sent to this user")

    # Create invitation
    invitation = CompanyInvitation(
        company_id=company.id,
        inviter_id=current_user.id,
        invitee_id=target.id,
        role=body.role,
    )
    db.add(invitation)
    db.flush()

    # Send notification to target user
    db.add(Notification(
        user_id=target.id,
        type="company_invite",
        title=f"Invitation from {company.name}",
        body=f"{current_user.name or current_user.username} invited you to join {company.name} as {body.role}",
        actor_id=current_user.id,
        reference_id=str(invitation.id),
    ))

    db.commit()
    return {"id": invitation.id, "message": f"Invitation sent to {target.name or target.username}"}


@router.post("/invitations/{invitation_id}/accept")
def accept_invitation(
    invitation_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    invitation = db.query(CompanyInvitation).filter(CompanyInvitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invitation.invitee_id != current_user.id:
        raise HTTPException(status_code=403, detail="This invitation is not for you")
    if invitation.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation already {invitation.status}")

    # Create company member
    member_icode = _generate_icode()
    while db.query(CompanyMember).filter(
        CompanyMember.company_id == invitation.company_id, CompanyMember.i_code == member_icode
    ).first():
        member_icode = _generate_icode()

    member = CompanyMember(
        company_id=invitation.company_id,
        user_id=current_user.id,
        role=invitation.role,
        i_code=member_icode,
    )
    db.add(member)
    invitation.status = "accepted"

    # Notify the inviter
    company = db.query(Company).filter(Company.id == invitation.company_id).first()
    db.add(Notification(
        user_id=invitation.inviter_id,
        type="system",
        title="Invitation accepted",
        body=f"{current_user.name or current_user.username} accepted your invitation to {company.name if company else 'the company'}",
        actor_id=current_user.id,
    ))

    db.commit()
    return {"message": "Invitation accepted. You are now a member."}


@router.post("/invitations/{invitation_id}/reject")
def reject_invitation(
    invitation_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    invitation = db.query(CompanyInvitation).filter(CompanyInvitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invitation.invitee_id != current_user.id:
        raise HTTPException(status_code=403, detail="This invitation is not for you")
    if invitation.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation already {invitation.status}")

    db.delete(invitation)
    db.commit()
    return {"message": "Invitation rejected"}


# ─── RBAC Helper ────────────────────────────────────────────────────────────

# Valid roles ordered by permission level (highest to lowest)
ROLE_HIERARCHY = ["owner", "admin", "manager", "employee", "member"]


def _require_role(db: Session, user_id: int, company_id: int, min_role: str) -> CompanyMember:
    """Raise 403 if user's role is below min_role in the hierarchy."""
    mem = _get_my_membership(db, user_id, company_id)
    if not mem:
        raise HTTPException(status_code=403, detail="You are not a member of this company")
    allowed = ROLE_HIERARCHY[: ROLE_HIERARCHY.index(min_role) + 1]
    if mem.role not in allowed:
        raise HTTPException(status_code=403, detail=f"Requires {min_role} role or higher")
    return mem


# ─── My Role ────────────────────────────────────────────────────────────────

@router.get("/my-role", response_model=MyRoleResponse)
def get_my_role(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Returns the current user's role and membership info in their company."""
    company = _get_my_company(db, current_user.id)
    if not company:
        return MyRoleResponse(role=None, company_id=None, member_id=None)
    mem = _get_my_membership(db, current_user.id, company.id)
    if not mem:
        return MyRoleResponse(role=None, company_id=company.id, member_id=None)
    return MyRoleResponse(role=mem.role, company_id=company.id, member_id=mem.id)


# ─── Pending Invitations (received) ─────────────────────────────────────────

@router.get("/invitations", response_model=list[PendingInvitationResponse])
def list_my_invitations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """List all pending company invitations for the current user."""
    invitations = (
        db.query(CompanyInvitation)
        .filter(CompanyInvitation.invitee_id == current_user.id, CompanyInvitation.status == "pending")
        .order_by(CompanyInvitation.created_at.desc())
        .all()
    )
    result = []
    for inv in invitations:
        company = db.query(Company).filter(Company.id == inv.company_id).first()
        inviter = db.query(User).filter(User.id == inv.inviter_id).first()
        result.append(PendingInvitationResponse(
            id=inv.id,
            company_id=inv.company_id,
            company_name=company.name if company else "Unknown",
            inviter_name=inviter.name or inviter.username if inviter else None,
            role=inv.role,
            created_at=inv.created_at.isoformat() if inv.created_at else None,
        ))
    return result


# ─── Invite Link (shareable code) ─────────────────────────────────────────

import hashlib
import time as _time


def _make_invite_code(company_id: int, secret: str = "alloul_invite") -> str:
    """Generate a deterministic 8-char invite code for the company."""
    raw = f"{company_id}:{secret}:{company_id * 31}"
    return hashlib.sha256(raw.encode()).hexdigest()[:8].upper()


@router.get("/invite-link", response_model=InviteLinkResponse)
def get_invite_link(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Get a shareable invite code for the company. Admin/Owner only."""
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company found")
    mem = _get_my_membership(db, current_user.id, company.id)
    if not mem or mem.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Owner or Admin required")
    invite_code = _make_invite_code(company.id)
    return InviteLinkResponse(
        invite_code=invite_code,
        company_name=company.name,
        expires_in_hours=48,
    )


class _JoinRequest(BaseModel):
    invite_code: str


class _JoinPreviewResponse(BaseModel):
    company_name: str
    company_logo: Optional[str] = None
    company_type: Optional[str] = None
    members_count: int = 0


@router.get("/join-preview")
def join_preview(
    code: str,
    db: Annotated[Session, Depends(get_db)],
):
    """Public — returns company info for an invite code (no auth required)."""
    code = code.strip().upper()
    all_companies = db.query(Company).all()
    target: Optional[Company] = None
    for c in all_companies:
        if _make_invite_code(c.id) == code:
            target = c
            break
    if not target:
        raise HTTPException(status_code=404, detail="رمز الدعوة غير صالح أو منتهي الصلاحية")
    members_count = db.query(CompanyMember).filter(CompanyMember.company_id == target.id).count()
    return _JoinPreviewResponse(
        company_name=target.name,
        company_logo=target.logo_url,
        company_type=target.company_type,
        members_count=members_count,
    )


@router.post("/join")
def join_by_invite_code(
    body: _JoinRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Join a company by invite code (from invite link)."""
    invite_code = body.invite_code
    if not invite_code:
        raise HTTPException(status_code=400, detail="invite_code is required")

    # Find matching company
    all_companies = db.query(Company).all()
    target_company: Optional[Company] = None
    for c in all_companies:
        if _make_invite_code(c.id) == invite_code.strip().upper():
            target_company = c
            break

    if not target_company:
        raise HTTPException(status_code=404, detail="Invalid or expired invite code")

    # Check not already a member
    if _get_my_membership(db, current_user.id, target_company.id):
        raise HTTPException(status_code=400, detail="You are already a member of this company")

    # Check subscription limit
    sub = _require_active_subscription(db, target_company.id, current_user=current_user)
    current_count = db.query(CompanyMember).filter(CompanyMember.company_id == target_company.id).count()
    limit = MAX_EMPLOYEES.get(sub.plan_id, 0)
    if limit and current_count >= limit:
        raise HTTPException(status_code=403, detail="Company has reached its member limit")

    # Add as employee
    for _ in range(50):
        mem_code = _generate_icode()
        if not db.query(CompanyMember).filter(
            CompanyMember.company_id == target_company.id, CompanyMember.i_code == mem_code
        ).first():
            break
    else:
        mem_code = _generate_icode()

    new_member = CompanyMember(
        company_id=target_company.id,
        user_id=current_user.id,
        role="employee",
        i_code=mem_code,
        work_id=generate_work_id(db),
    )
    db.add(new_member)
    db.commit()
    _log_activity(db, target_company.id, current_user.id, "member_joined_via_link",
                  f"{current_user.name or current_user.username} joined via invite link")

    # Auto-complete the invite onboarding step
    _tick_onboarding(db, target_company.id, "step_invite")

    return {"message": f"You have joined {target_company.name}", "company_id": target_company.id}


# ─── Onboarding ─────────────────────────────────────────────────────────────

class JoinByCodeRequest(BaseModel):
    invite_code: str


def _tick_onboarding(db: Session, company_id: int, step: str) -> None:
    """Mark an onboarding step as done and check if all complete."""
    ob = db.query(CompanyOnboarding).filter(CompanyOnboarding.company_id == company_id).first()
    if not ob:
        ob = CompanyOnboarding(company_id=company_id)
        db.add(ob)
    setattr(ob, step, 1)
    # Auto-complete when all 4 steps done
    if ob.step_profile and ob.step_team and ob.step_invite and ob.step_project:
        ob.completed = 1
    db.commit()


@router.get("/onboarding", response_model=OnboardingStatusResponse)
def get_onboarding_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Returns onboarding completion status for the current user's company."""
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company found")
    ob = db.query(CompanyOnboarding).filter(CompanyOnboarding.company_id == company.id).first()
    if not ob:
        # Create on-demand for existing companies (migration-safe)
        ob = CompanyOnboarding(company_id=company.id)
        db.add(ob)
        db.commit()
        db.refresh(ob)
    return OnboardingStatusResponse(
        step_profile=bool(ob.step_profile),
        step_team=bool(ob.step_team),
        step_invite=bool(ob.step_invite),
        step_project=bool(ob.step_project),
        completed=bool(ob.completed),
    )


class CompleteStepRequest(BaseModel):
    step: str  # profile, team, invite, project


@router.post("/onboarding/complete-step")
def complete_onboarding_step(
    body: CompleteStepRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Mark an onboarding step as completed."""
    company = _get_my_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company found")
    valid_steps = {"profile": "step_profile", "team": "step_team", "invite": "step_invite", "project": "step_project"}
    field = valid_steps.get(body.step)
    if not field:
        raise HTTPException(status_code=400, detail=f"Invalid step. Valid: {list(valid_steps.keys())}")
    _tick_onboarding(db, company.id, field)
    return {"message": f"Step '{body.step}' marked complete"}


# ─── Email Invitations ───────────────────────────────────────────────────────

import secrets
from datetime import datetime, timezone, timedelta


async def _send_invite_email(to_email: str, company_name: str, inviter_name: str, role: str, token: str) -> None:
    """Send invitation email via Resend. Silently skips if RESEND_API_KEY not configured."""
    from config import settings
    if not settings.RESEND_API_KEY:
        return
    import httpx
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    invite_url = f"{frontend_url}/invite/{token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#111;color:#f5f5f5;border-radius:12px">
      <h2 style="color:#F5EFE6">دعوة للانضمام إلى {company_name}</h2>
      <p>مرحباً،<br>دعاك <strong>{inviter_name}</strong> للانضمام إلى <strong>{company_name}</strong> بدور <strong>{role}</strong>.</p>
      <a href="{invite_url}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        قبول الدعوة
      </a>
      <p style="color:#888;font-size:12px">الرابط صالح لمدة 72 ساعة. إذا لم تطلب هذه الدعوة، تجاهل هذا الإيميل.</p>
    </div>
    """
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": settings.EMAIL_FROM, "to": [to_email], "subject": f"دعوة للانضمام إلى {company_name}", "html": html},
        )


@router.post("/invite-email", status_code=201)
async def send_email_invitation(
    body: EmailInviteRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Send an email invitation to any email address. Owner/Admin only."""
    membership = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not membership or membership.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can send email invitations")
    company = db.query(Company).filter(Company.id == membership.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    email = body.email.strip().lower()
    # Check if already a member via this email
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        already = db.query(CompanyMember).filter(
            CompanyMember.company_id == company.id, CompanyMember.user_id == existing_user.id
        ).first()
        if already:
            raise HTTPException(status_code=400, detail="This user is already a member")
    # Cancel previous pending invite for same email
    old = db.query(EmailInvitation).filter(
        EmailInvitation.company_id == company.id,
        EmailInvitation.email == email,
        EmailInvitation.status == "pending",
    ).first()
    if old:
        old.status = "expired"
    token = secrets.token_urlsafe(32)
    invite = EmailInvitation(
        company_id=company.id,
        inviter_id=current_user.id,
        email=email,
        role=body.role,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=72),
    )
    db.add(invite)
    db.commit()
    inviter_name = current_user.name or current_user.username or "مسؤول"
    await _send_invite_email(email, company.name, inviter_name, body.role, token)
    _tick_onboarding(db, company.id, "step_invite")
    return {"message": f"Invitation sent to {email}", "token": token}


@router.get("/email-invite/{token}", response_model=EmailInviteInfoResponse)
def get_email_invite_info(token: str, db: Annotated[Session, Depends(get_db)]):
    """Public — returns invite details so the frontend can show company info before signup."""
    invite = db.query(EmailInvitation).filter(EmailInvitation.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invite.status != "pending":
        raise HTTPException(status_code=410, detail=f"Invitation already {invite.status}")
    if invite.expires_at < datetime.now(timezone.utc):
        invite.status = "expired"
        db.commit()
        raise HTTPException(status_code=410, detail="Invitation has expired")
    company = db.query(Company).filter(Company.id == invite.company_id).first()
    inviter = db.query(User).filter(User.id == invite.inviter_id).first()
    return EmailInviteInfoResponse(
        token=token,
        company_name=company.name if company else "Unknown",
        company_logo=company.logo_url if company else None,
        inviter_name=inviter.name or inviter.username if inviter else None,
        role=invite.role,
        email=invite.email,
        expires_at=invite.expires_at.isoformat(),
    )


@router.post("/email-invite/{token}/accept", response_model=AcceptEmailInviteResponse)
def accept_email_invite(
    token: str,
    body: AcceptEmailInviteRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """Accept email invite. Creates account if user doesn't exist. Returns JWT."""
    from auth import create_access_token, get_password_hash
    from routers.auth import _generate_user_icode, _generate_employee_no

    invite = db.query(EmailInvitation).filter(EmailInvitation.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invite.status != "pending":
        raise HTTPException(status_code=410, detail=f"Invitation already {invite.status}")
    if invite.expires_at < datetime.now(timezone.utc):
        invite.status = "expired"
        db.commit()
        raise HTTPException(status_code=410, detail="Invitation has expired")

    # Find or create user
    user = db.query(User).filter(User.email == invite.email).first()
    if not user:
        # Validate new account fields
        if not body.username or not body.password:
            raise HTTPException(status_code=400, detail="Username and password required for new account")
        if len(body.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        username = body.username.strip().lower()
        if db.query(User).filter(User.username == username).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        user = User(
            email=invite.email,
            username=username,
            hashed_password=get_password_hash(body.password),
            name=body.name or username,
            i_code=_generate_user_icode(db),
            employee_no=_generate_employee_no(db),
        )
        db.add(user)
        db.flush()
    else:
        # User exists — just add membership
        already = db.query(CompanyMember).filter(
            CompanyMember.company_id == invite.company_id, CompanyMember.user_id == user.id
        ).first()
        if already:
            raise HTTPException(status_code=400, detail="You are already a member of this company")

    # Create membership
    mem_code = _generate_icode()
    while db.query(CompanyMember).filter(
        CompanyMember.company_id == invite.company_id, CompanyMember.i_code == mem_code
    ).first():
        mem_code = _generate_icode()

    from routers.employees import generate_work_id as _gen_work_id
    member = CompanyMember(
        company_id=invite.company_id,
        user_id=user.id,
        role=invite.role,
        i_code=mem_code,
        work_id=_gen_work_id(db),
    )
    db.add(member)
    invite.status = "accepted"
    invite.accepted_at = datetime.now(timezone.utc)
    db.commit()

    token_jwt = create_access_token(data={"sub": str(user.id)})
    return AcceptEmailInviteResponse(access_token=token_jwt)


# ─── Join Requests (lobby system) ────────────────────────────────────────────

class JoinRequestBody(BaseModel):
    company_id: Optional[int] = None
    company_i_code: Optional[str] = None  # company's public i_code (not invite link code)
    message: Optional[str] = None


class JoinRequestResponse(BaseModel):
    id: int
    company_id: int
    company_name: str
    company_logo: Optional[str]
    status: str
    message: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class JoinRequestAdminItem(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    user_avatar: Optional[str]
    message: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.post("/request-join", status_code=201, response_model=JoinRequestResponse)
def request_join_company(
    body: JoinRequestBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Employee requests to join a company. Admin reviews and accepts/rejects."""
    # Resolve company
    company: Optional[Company] = None
    if body.company_id:
        company = db.query(Company).filter(Company.id == body.company_id).first()
    elif body.company_i_code:
        company = db.query(Company).filter(Company.i_code == body.company_i_code.strip().upper()).first()

    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة — تحقق من الرمز")

    # Already a member?
    if _get_my_membership(db, current_user.id, company.id):
        raise HTTPException(status_code=400, detail="أنت عضو في هذه الشركة مسبقاً")

    # Already a pending request?
    existing = db.query(JoinRequest).filter(
        JoinRequest.company_id == company.id,
        JoinRequest.user_id == current_user.id,
        JoinRequest.status == "pending",
    ).first()
    if existing:
        return JoinRequestResponse(
            id=existing.id,
            company_id=company.id,
            company_name=company.name,
            company_logo=company.logo_url,
            status=existing.status,
            message=existing.message,
            created_at=existing.created_at.isoformat(),
        )

    jr = JoinRequest(
        company_id=company.id,
        user_id=current_user.id,
        message=body.message,
    )
    db.add(jr)
    db.commit()
    db.refresh(jr)

    # Notify company admins/owners
    admins = db.query(CompanyMember).filter(
        CompanyMember.company_id == company.id,
        CompanyMember.role.in_(["owner", "admin"]),
    ).all()
    for adm in admins:
        notif = Notification(
            user_id=adm.user_id,
            type="join_request",
            title="طلب انضمام جديد",
            body=f"{current_user.name or current_user.username} يطلب الانضمام إلى {company.name}",
            reference_id=str(jr.id),
        )
        db.add(notif)
    db.commit()

    return JoinRequestResponse(
        id=jr.id,
        company_id=company.id,
        company_name=company.name,
        company_logo=company.logo_url,
        status=jr.status,
        message=jr.message,
        created_at=jr.created_at.isoformat(),
    )


@router.get("/my-join-status", response_model=Optional[JoinRequestResponse])
def my_join_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Return the user's most recent join request (pending or decided)."""
    jr = (
        db.query(JoinRequest)
        .filter(JoinRequest.user_id == current_user.id)
        .order_by(JoinRequest.created_at.desc())
        .first()
    )
    if not jr:
        return None
    company = db.query(Company).filter(Company.id == jr.company_id).first()
    return JoinRequestResponse(
        id=jr.id,
        company_id=jr.company_id,
        company_name=company.name if company else "Unknown",
        company_logo=company.logo_url if company else None,
        status=jr.status,
        message=jr.message,
        created_at=jr.created_at.isoformat(),
    )


@router.get("/join-requests", response_model=list[JoinRequestAdminItem])
def list_join_requests(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Admin/Owner: list pending join requests for their company."""
    membership = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not membership or membership.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="غير مصرح")

    requests = (
        db.query(JoinRequest)
        .filter(JoinRequest.company_id == membership.company_id, JoinRequest.status == "pending")
        .order_by(JoinRequest.created_at.asc())
        .all()
    )
    result = []
    for jr in requests:
        u = db.query(User).filter(User.id == jr.user_id).first()
        result.append(JoinRequestAdminItem(
            id=jr.id,
            user_id=jr.user_id,
            user_name=u.name or u.username if u else "Unknown",
            user_email=u.email if u else "",
            user_avatar=getattr(u, "profile_picture", None) if u else None,
            message=jr.message,
            created_at=jr.created_at.isoformat(),
        ))
    return result


@router.post("/join-requests/{request_id}/accept")
def accept_join_request(
    request_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Admin accepts a join request — adds the user as employee."""
    membership = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not membership or membership.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="غير مصرح")

    jr = db.query(JoinRequest).filter(
        JoinRequest.id == request_id, JoinRequest.company_id == membership.company_id
    ).first()
    if not jr:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if jr.status != "pending":
        raise HTTPException(status_code=400, detail=f"الطلب {jr.status} مسبقاً")

    # Check subscription limit
    company = db.query(Company).filter(Company.id == membership.company_id).first()
    sub = db.query(Subscription).filter(
        Subscription.company_id == membership.company_id, Subscription.status == "active"
    ).first()
    if sub:
        current_count = db.query(CompanyMember).filter(CompanyMember.company_id == membership.company_id).count()
        limit = MAX_EMPLOYEES.get(sub.plan_id, 0)
        if limit and current_count >= limit:
            raise HTTPException(status_code=403, detail="تجاوزت حد الأعضاء في الباقة الحالية")

    # Generate work_id and i_code for member
    mem_code = _generate_icode()
    for _ in range(50):
        if not db.query(CompanyMember).filter(
            CompanyMember.company_id == membership.company_id, CompanyMember.i_code == mem_code
        ).first():
            break
        mem_code = _generate_icode()

    new_member = CompanyMember(
        company_id=membership.company_id,
        user_id=jr.user_id,
        role=jr.role,
        i_code=mem_code,
        work_id=generate_work_id(db),
    )
    db.add(new_member)

    jr.status = "accepted"
    jr.reviewed_by = current_user.id
    jr.reviewed_at = datetime.now(timezone.utc)
    db.commit()

    # Notify user
    notif = Notification(
        user_id=jr.user_id,
        type="join_request_accepted",
        title="تم قبول طلبك!",
        body=f"تم قبولك في {company.name if company else 'الشركة'}. يمكنك الآن الدخول للمنصة.",
        reference_id=str(membership.company_id),
    )
    db.add(notif)
    db.commit()

    return {"message": "تم قبول الطلب وإضافة الموظف"}


@router.post("/join-requests/{request_id}/reject")
def reject_join_request(
    request_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Admin rejects a join request."""
    membership = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not membership or membership.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="غير مصرح")

    jr = db.query(JoinRequest).filter(
        JoinRequest.id == request_id, JoinRequest.company_id == membership.company_id
    ).first()
    if not jr:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if jr.status != "pending":
        raise HTTPException(status_code=400, detail=f"الطلب {jr.status} مسبقاً")

    jr.status = "rejected"
    jr.reviewed_by = current_user.id
    jr.reviewed_at = datetime.now(timezone.utc)
    db.commit()

    company = db.query(Company).filter(Company.id == membership.company_id).first()
    notif = Notification(
        user_id=jr.user_id,
        type="join_request_rejected",
        title="طلب الانضمام",
        body=f"تعذّر قبول طلبك في {company.name if company else 'الشركة'} في الوقت الحالي.",
        reference_id=str(membership.company_id),
    )
    db.add(notif)
    db.commit()

    return {"message": "تم رفض الطلب"}


@router.get("/search-by-icode/{i_code}")
def search_company_by_icode(
    i_code: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Find a company by its public i_code for join request flow."""
    company = db.query(Company).filter(Company.i_code == i_code.strip().upper()).first()
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")
    return {"id": company.id, "name": company.name, "logo_url": getattr(company, "logo_url", None)}


# ─── Hiring Board (keep existing) ────────────────────────────────────────────
