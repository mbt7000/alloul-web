from __future__ import annotations

# Company & subscription schemas

from pydantic import BaseModel
from typing import Optional


class CompanyCreate(BaseModel):
    name: str
    company_type: Optional[str] = None  # startup, smb, enterprise, other
    size: Optional[str] = None  # 1-10, 11-50, 51-200, 200+
    founder_name: Optional[str] = None
    founder_email: Optional[str] = None
    logo_url: Optional[str] = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    company_type: Optional[str] = None
    size: Optional[str] = None
    logo_url: Optional[str] = None
    founder_name: Optional[str] = None
    i_code: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class CompanyUpdate(BaseModel):
    logo_url: Optional[str] = None


class SubscribeRequest(BaseModel):
    plan_id: str  # starter, pro, pro_plus, enterprise


class SubscribeResponse(BaseModel):
    checkout_url: str


class SubscriptionStatusResponse(BaseModel):
    plan_id: Optional[str] = None
    status: Optional[str] = None
    current_period_end: Optional[str] = None
    trial_end: Optional[str] = None
    cancel_at_period_end: bool = False


class DepartmentCreate(BaseModel):
    name: str


class DepartmentResponse(BaseModel):
    id: int
    company_id: int
    name: str

    class Config:
        from_attributes = True


class CompanyMemberCreate(BaseModel):
    user_id: int
    role: str  # admin, manager, employee
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    job_title: Optional[str] = None


class CompanyMemberResponse(BaseModel):
    id: int
    company_id: int
    user_id: int
    role: str
    department_id: Optional[int] = None
    i_code: str
    work_id: Optional[str] = None
    manager_id: Optional[int] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class ActivityLogResponse(BaseModel):
    id: int
    company_id: int
    user_id: Optional[int] = None
    action: str
    details: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class CompanyStatsResponse(BaseModel):
    total_members: int
    total_departments: int
    plan_id: Optional[str] = None
    subscription_status: Optional[str] = None
    max_employees: Optional[int] = None  # from plan


class MyRoleResponse(BaseModel):
    role: Optional[str] = None        # owner, admin, manager, employee, or null
    company_id: Optional[int] = None
    member_id: Optional[int] = None


class InviteLinkResponse(BaseModel):
    invite_code: str
    company_name: str
    expires_in_hours: int = 48


class OnboardingStatusResponse(BaseModel):
    step_profile: bool
    step_team: bool
    step_invite: bool
    step_project: bool
    completed: bool


class PendingInvitationResponse(BaseModel):
    id: int
    company_id: int
    company_name: str
    inviter_name: Optional[str] = None
    role: str
    created_at: Optional[str] = None
