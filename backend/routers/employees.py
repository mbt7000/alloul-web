"""
Employees Router — Work ID System
===================================
Handles Work ID generation, lookup, and member-add-by-work-id flows.

Work ID format: EMP-YYYY-NNNN-XXXX
  YYYY = year joined
  NNNN = 4 random digits
  XXXX = 4 random uppercase alphanumeric chars

Globally unique across all company_members rows.
"""
from __future__ import annotations

import random
import string
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Company, CompanyMember, User

router = APIRouter(prefix="/employees", tags=["employees"])


# ─── Work ID helpers ──────────────────────────────────────────────────────────

def generate_work_id(db: Session) -> str:
    """Generate a globally unique Work ID: EMP-YYYY-NNNN-XXXX."""
    year = datetime.utcnow().year
    for _ in range(100):
        num = "".join(random.choices(string.digits, k=4))
        alpha = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        wid = f"EMP-{year}-{num}-{alpha}"
        if not db.query(CompanyMember).filter(CompanyMember.work_id == wid).first():
            return wid
    raise RuntimeError("Could not generate a unique work_id after 100 attempts")


def ensure_work_id(member: CompanyMember, db: Session) -> str:
    """Backfill work_id for an existing member that doesn't have one yet."""
    if not member.work_id:
        member.work_id = generate_work_id(db)
        db.commit()
        db.refresh(member)
    return member.work_id


# ─── Schemas ──────────────────────────────────────────────────────────────────

class MyEmployeeProfile(BaseModel):
    membership_id: int
    company_id: int
    company_name: str
    role: str
    job_title: Optional[str]
    work_id: str
    joined_at: Optional[str]


class WorkIdPreview(BaseModel):
    """What the admin sees before confirming the add-by-work-id."""
    work_id: str
    user_id: int
    user_name: Optional[str]
    user_email: Optional[str]
    current_company: Optional[str]
    role: str
    job_title: Optional[str]


# ─── GET /employees/me ────────────────────────────────────────────────────────

@router.get("/me", response_model=MyEmployeeProfile)
def get_my_employee_profile(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return the current user's Work ID and company membership details."""
    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="You are not a member of any company workspace")

    work_id = ensure_work_id(member, db)

    company = db.query(Company).filter(Company.id == member.company_id).first()
    return MyEmployeeProfile(
        membership_id=member.id,
        company_id=member.company_id,
        company_name=company.name if company else "—",
        role=member.role,
        job_title=member.job_title,
        work_id=work_id,
        joined_at=member.created_at.isoformat() if member.created_at else None,
    )


# ─── POST /employees/validate-work-id ────────────────────────────────────────

class ValidateRequest(BaseModel):
    work_id: str


@router.post("/validate-work-id", response_model=WorkIdPreview)
def validate_work_id(
    body: ValidateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Look up a Work ID. Returns a preview so the admin can confirm before adding.
    The caller must be a company admin/manager to use this endpoint.
    """
    # Caller must be an admin/manager of some company
    caller_mem = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not caller_mem or caller_mem.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="Only company admins and managers can look up Work IDs")

    wid = body.work_id.strip().upper()
    member = db.query(CompanyMember).filter(CompanyMember.work_id == wid).first()
    if not member:
        raise HTTPException(status_code=404, detail="Work ID not found")

    user = db.query(User).filter(User.id == member.user_id).first()
    company = db.query(Company).filter(Company.id == member.company_id).first()

    return WorkIdPreview(
        work_id=wid,
        user_id=member.user_id,
        user_name=user.name or user.username if user else None,
        user_email=user.email if user else None,
        current_company=company.name if company else None,
        role=member.role,
        job_title=member.job_title,
    )


# ─── POST /employees/add-by-work-id ──────────────────────────────────────────

class AddByWorkIdRequest(BaseModel):
    work_id: str
    role: str = "employee"
    job_title: Optional[str] = None
    department_id: Optional[int] = None


class AddByWorkIdResponse(BaseModel):
    message: str
    membership_id: int
    work_id: str
    user_name: Optional[str]


@router.post(
    "/add-by-work-id",
    response_model=AddByWorkIdResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_member_by_work_id(
    body: AddByWorkIdRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Admin adds a user to their company using the user's Work ID.
    The user must already have a Work ID (i.e., they are/were a member of another workspace).
    """
    # Caller must be admin/owner of their company
    caller_mem = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not caller_mem:
        raise HTTPException(status_code=403, detail="You are not a member of any company")
    if caller_mem.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="Only owners, admins, and managers can add members")

    company = db.query(Company).filter(Company.id == caller_mem.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    wid = body.work_id.strip().upper()
    source_member = db.query(CompanyMember).filter(CompanyMember.work_id == wid).first()
    if not source_member:
        raise HTTPException(status_code=404, detail="Work ID not found — make sure it's typed correctly")

    target_user_id = source_member.user_id

    # Cannot add yourself
    if target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot add yourself")

    # Already in this company?
    existing = db.query(CompanyMember).filter(
        CompanyMember.company_id == caller_mem.company_id,
        CompanyMember.user_id == target_user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This user is already a member of your company")

    # Validate role
    valid_roles = {"employee", "manager", "admin"}
    role = body.role if body.role in valid_roles else "employee"

    # Generate internal i_code (per-company unique)
    import random as _r, string as _s
    for _ in range(50):
        icode = "".join(_r.choices(_s.digits, k=6))
        if not db.query(CompanyMember).filter(
            CompanyMember.company_id == caller_mem.company_id,
            CompanyMember.i_code == icode,
        ).first():
            break

    # Generate a fresh work_id for this new membership
    new_work_id = generate_work_id(db)

    new_mem = CompanyMember(
        company_id=caller_mem.company_id,
        user_id=target_user_id,
        role=role,
        i_code=icode,
        work_id=new_work_id,
        job_title=body.job_title,
        department_id=body.department_id,
    )
    db.add(new_mem)
    db.commit()
    db.refresh(new_mem)

    user = db.query(User).filter(User.id == target_user_id).first()
    user_name = user.name or user.username if user else None

    return AddByWorkIdResponse(
        message=f"تمت إضافة {user_name or 'العضو'} إلى {company.name} بنجاح",
        membership_id=new_mem.id,
        work_id=new_work_id,
        user_name=user_name,
    )
