"""
Work Summary Agent — API endpoints
POST /work-agent/submit       → receive new work from employee
POST /work-agent/ask          → ask question about work status
POST /work-agent/handover     → generate handover report (manual trigger)
POST /work-agent/shift        → shift-change summary
GET  /work-agent/logs         → list company work logs
"""
from __future__ import annotations

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User, Company, CompanyMember

router = APIRouter(prefix="/work-agent", tags=["work-agent"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class WorkSubmitRequest(BaseModel):
    work_text: str
    company_id: int


class QuestionRequest(BaseModel):
    question: str
    company_id: int


class HandoverRequest(BaseModel):
    company_id: int
    language: Optional[str] = "en"   # ar | en | fr
    trigger: Optional[str] = "manual"


class ShiftRequest(BaseModel):
    company_id: int
    language: Optional[str] = "ar"


class WorkLogResponse(BaseModel):
    id: int
    employee_name: str
    task_en: str
    status: str
    priority: str
    ai_summary_en: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _verify_company_access(db: Session, user_id: int, company_id: int) -> Company:
    """Ensure user belongs to the requested company."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, detail="Company not found")

    member = db.query(CompanyMember).filter(
        CompanyMember.company_id == company_id,
        CompanyMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(403, detail="Access denied to this company")

    return company


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/submit")
async def submit_work(
    req: WorkSubmitRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Employee submits work in any language.
    Agent translates to English, stores, returns confirmation in original language.
    """
    _verify_company_access(db, current_user.id, req.company_id)

    from services.work_summary_agent import work_agent

    result = await work_agent.receive_work(
        db=db,
        company_id=req.company_id,
        user_id=current_user.id,
        employee_name=current_user.name or current_user.username,
        work_text=req.work_text,
    )
    return result


@router.post("/ask")
async def ask_about_work(
    req: QuestionRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Employee asks about work status in any language.
    Agent answers in same language using company data only.
    """
    _verify_company_access(db, current_user.id, req.company_id)

    from services.work_summary_agent import work_agent

    answer = await work_agent.answer_question(
        db=db,
        company_id=req.company_id,
        question=req.question,
    )
    return {"answer": answer}


@router.post("/handover")
async def generate_handover(
    req: HandoverRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Generate a full handover report for the company.
    Can be triggered manually or by scheduler.
    Language: ar | en | fr
    """
    company = _verify_company_access(db, current_user.id, req.company_id)

    from services.work_summary_agent import work_agent

    report = await work_agent.generate_handover(
        db=db,
        company_id=req.company_id,
        company_name=company.name,
        response_language=req.language or "en",
        trigger=req.trigger or "manual",
    )
    return {"handover": report, "company": company.name, "language": req.language}


@router.post("/shift")
async def shift_summary(
    req: ShiftRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Quick shift-change summary — open tasks only.
    Given to incoming shift team.
    """
    _verify_company_access(db, current_user.id, req.company_id)

    from services.work_summary_agent import work_agent

    summary = await work_agent.get_shift_summary(
        db=db,
        company_id=req.company_id,
        response_language=req.language or "ar",
    )
    return {"shift_summary": summary}


@router.get("/logs")
def get_work_logs(
    company_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: Optional[str] = None,
    limit: int = 50,
):
    """List work logs for a company — filtered by status optionally."""
    _verify_company_access(db, current_user.id, company_id)

    from models import WorkLog

    query = db.query(WorkLog).filter(WorkLog.company_id == company_id)
    if status:
        query = query.filter(WorkLog.status == status)

    logs = query.order_by(WorkLog.created_at.desc()).limit(limit).all()

    return [
        {
            "id": log.id,
            "employee_name": log.employee_name,
            "task_en": log.task_en,
            "status": log.status,
            "priority": log.priority,
            "ai_summary_en": log.ai_summary_en,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
