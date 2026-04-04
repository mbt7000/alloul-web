from __future__ import annotations

import random
import string
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth import get_current_user
from admin_access import user_is_admin
from database import get_db
from models import User, Company, Subscription, Department, CompanyMember, ActivityLog, CompanyInvitation, Notification
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
)

router = APIRouter(prefix="/companies", tags=["companies"])


def _member_phone_for_user(db: Session, user_id: int) -> Optional[str]:
    u = db.query(User).filter(User.id == user_id).first()
    if not u or not getattr(u, "phone", None):
        return None
    p = u.phone.strip() if isinstance(u.phone, str) else None
    return p or None


def _generate_icode(length: int = 6) -> str:
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


MAX_EMPLOYEES = {"starter": 10, "pro": 50, "pro_plus": 200}


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
    if sub and sub.status in ("active", "trialing"):
        return sub
    if current_user and user_is_admin(current_user):
        if sub is not None:
            return sub

        class _AdminPlanBypass:
            plan_id = "pro_plus"
            status = "active"

        return _AdminPlanBypass()  # type: ignore[return-value]
    if not sub or sub.status not in ("active", "trialing"):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Active subscription required",
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
        role="admin",
        i_code=mem_code,
    )
    db.add(member)
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

def _get_stripe_price_id(plan_id: str):
    from config import settings
    m = {
        "starter": settings.STRIPE_PRICE_STARTER,
        "pro": settings.STRIPE_PRICE_PRO,
        "pro_plus": settings.STRIPE_PRICE_PRO_PLUS,
    }
    return m.get(plan_id)


@router.post("/subscribe", response_model=SubscribeResponse)
def subscribe(
    body: SubscribeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if body.plan_id == "enterprise":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contact us for Enterprise")
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
    success_url = f"{settings.FRONTEND_URL}/dashboard?subscription=success"
    cancel_url = f"{settings.FRONTEND_URL}/pricing"
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        subscription_data={"trial_period_days": 14},
        payment_method_collection="if_required",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"company_id": str(company.id), "plan_id": body.plan_id},
    )
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


@router.get("/subscription-status", response_model=SubscriptionStatusResponse)
def subscription_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    company = _get_my_company(db, current_user.id)
    if not company:
        return SubscriptionStatusResponse(plan_id=None, status=None)
    if user_is_admin(current_user):
        return SubscriptionStatusResponse(
            plan_id="admin",
            status="active",
            current_period_end=None,
            trial_end=None,
            cancel_at_period_end=False,
        )
    sub = db.query(Subscription).filter(Subscription.company_id == company.id).order_by(Subscription.id.desc()).first()
    if not sub:
        return SubscriptionStatusResponse(plan_id=None, status=None)
    return SubscriptionStatusResponse(
        plan_id=sub.plan_id,
        status=sub.status,
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
        trial_end=sub.trial_end.isoformat() if sub.trial_end else None,
        cancel_at_period_end=bool(getattr(sub, "cancel_at_period_end", 0)),
    )


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
    return [
        CompanyMemberResponse(
            id=m.id, company_id=m.company_id, user_id=m.user_id, role=m.role,
            department_id=m.department_id, i_code=m.i_code, manager_id=m.manager_id, job_title=m.job_title,
            phone=_member_phone_for_user(db, m.user_id),
        )
        for m in members
    ]


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
    )
    db.add(new_mem)
    db.commit()
    db.refresh(new_mem)
    _log_activity(db, company.id, current_user.id, "member_added", f"user_id={body.user_id}")
    return CompanyMemberResponse(
        id=new_mem.id, company_id=new_mem.company_id, user_id=new_mem.user_id, role=new_mem.role,
        department_id=new_mem.department_id, i_code=new_mem.i_code, manager_id=new_mem.manager_id, job_title=new_mem.job_title,
        phone=_member_phone_for_user(db, new_mem.user_id),
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
    return CompanyMemberResponse(
        id=target.id, company_id=target.company_id, user_id=target.user_id, role=target.role,
        department_id=target.department_id, i_code=target.i_code, manager_id=target.manager_id, job_title=target.job_title,
        phone=_member_phone_for_user(db, target.user_id),
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
    max_employees = {"starter": 10, "pro": 50, "pro_plus": 200}.get(plan_id or "") if plan_id else None
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
