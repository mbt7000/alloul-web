from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from typing import Annotated, Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User, Company, CompanyMember, JobPosting, JobApplication, UserCV

router = APIRouter(prefix="/workspace/recruitment", tags=["recruitment"])

# ─── Helpers ─────────────────────────────────────────────────────────────────

VALID_STAGES = ("applied", "screening", "interview", "offer", "hired", "rejected", "withdrawn")


def _get_company_member(db: Session, user: User) -> CompanyMember:
    """Verify user is a company member with sufficient role; return the member row."""
    member = db.query(CompanyMember).filter(CompanyMember.user_id == user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a company member")
    if member.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return member


def _parse_json_field(value: Optional[str]) -> list:
    if not value:
        return []
    try:
        return json.loads(value)
    except Exception:
        return [value]


def _cv_to_dict(cv: Optional[UserCV]) -> Optional[dict]:
    if cv is None:
        return None
    return {
        "id": cv.id,
        "user_id": cv.user_id,
        "full_name": cv.full_name,
        "title": cv.title,
        "summary": cv.summary,
        "phone": cv.phone,
        "email": cv.email,
        "location": cv.location,
        "years_experience": cv.years_experience,
        "skills": _parse_json_field(cv.skills),
        "education": _parse_json_field(cv.education),
        "certifications": _parse_json_field(cv.certifications),
        "languages": _parse_json_field(cv.languages),
        "linkedin_url": cv.linkedin_url,
        "portfolio_url": cv.portfolio_url,
        "created_at": cv.created_at.isoformat() if cv.created_at else None,
        "updated_at": cv.updated_at.isoformat() if cv.updated_at else None,
    }


def _job_to_dict(job: JobPosting, db: Session) -> dict:
    apps_count = db.query(JobApplication).filter(JobApplication.job_id == job.id).count()
    return {
        "id": job.id,
        "title": job.title,
        "job_type": job.job_type,
        "location": job.location,
        "description": job.description,
        "requirements": job.requirements,
        "salary_range": job.salary_range,
        "min_experience": job.min_experience,
        "required_skills": _parse_json_field(job.required_skills),
        "is_active": job.is_active,
        "applications_count": apps_count,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


def _app_to_dict(app: JobApplication, db: Session) -> dict:
    job = app.job
    applicant = app.applicant
    cv = db.query(UserCV).filter(UserCV.user_id == app.user_id).first() if app.user_id else None
    return {
        "id": app.id,
        "job_id": app.job_id,
        "job_title": job.title if job else None,
        "applicant_id": app.user_id,
        "applicant_name": (applicant.name or applicant.username) if applicant else None,
        "applicant_username": applicant.username if applicant else None,
        "applicant_avatar": applicant.avatar_url if applicant else None,
        "cover_letter": app.cover_letter,
        "status": app.status,
        "stage": app.status,  # status doubles as stage
        "rating": None,
        "internal_note": None,
        "cv": _cv_to_dict(cv),
        "created_at": app.created_at.isoformat() if app.created_at else None,
    }


# ─── Schemas ─────────────────────────────────────────────────────────────────

class JobCreateBody(BaseModel):
    title: str
    job_type: Optional[str] = "full_time"
    location: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    min_experience: Optional[int] = None
    required_skills: Optional[List[str]] = None


class JobUpdateBody(BaseModel):
    title: Optional[str] = None
    job_type: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    min_experience: Optional[int] = None
    required_skills: Optional[List[str]] = None
    is_active: Optional[bool] = None


class StageUpdateBody(BaseModel):
    stage: Optional[str] = None
    status: Optional[str] = None  # backward compat alias


class NoteUpdateBody(BaseModel):
    note: Optional[str] = None
    rating: Optional[int] = None


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/dashboard")
def recruitment_dashboard(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    member = _get_company_member(db, current_user)
    company_id = member.company_id

    # Count active jobs
    open_jobs = db.query(JobPosting).filter(
        JobPosting.company_id == company_id,
        JobPosting.is_active == True,
    ).count()

    # Get all job IDs for this company
    job_ids = [
        row[0] for row in db.query(JobPosting.id).filter(
            JobPosting.company_id == company_id
        ).all()
    ]

    if not job_ids:
        return {
            "open_jobs": open_jobs,
            "total_applicants": 0,
            "new_this_week": 0,
            "hired": 0,
            "pending_review": 0,
            "stages": {
                "applied": 0, "screening": 0, "interview": 0,
                "offer": 0, "hired": 0, "rejected": 0,
            },
        }

    all_apps = db.query(JobApplication).filter(
        JobApplication.job_id.in_(job_ids)
    ).all()

    total_applicants = len(all_apps)

    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_this_week = sum(
        1 for a in all_apps
        if a.created_at and (
            a.created_at.replace(tzinfo=timezone.utc) if a.created_at.tzinfo is None else a.created_at
        ) >= one_week_ago
    )

    stage_counts: dict = {s: 0 for s in ("applied", "screening", "interview", "offer", "hired", "rejected")}
    pending_review = 0
    hired_count = 0

    for a in all_apps:
        stage = a.status or "applied"
        if stage in stage_counts:
            stage_counts[stage] += 1
        if stage == "hired":
            hired_count += 1
        if stage in ("pending", "applied"):
            pending_review += 1

    return {
        "open_jobs": open_jobs,
        "total_applicants": total_applicants,
        "new_this_week": new_this_week,
        "hired": hired_count,
        "pending_review": pending_review,
        "stages": stage_counts,
    }


@router.get("/jobs")
def list_company_jobs(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    member = _get_company_member(db, current_user)
    jobs = (
        db.query(JobPosting)
        .filter(JobPosting.company_id == member.company_id)
        .order_by(JobPosting.created_at.desc())
        .all()
    )
    return [_job_to_dict(j, db) for j in jobs]


@router.post("/jobs", status_code=status.HTTP_201_CREATED)
def create_job(
    body: JobCreateBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    member = _get_company_member(db, current_user)
    job = JobPosting(
        company_id=member.company_id,
        posted_by=current_user.id,
        title=body.title,
        job_type=body.job_type,
        location=body.location,
        description=body.description,
        requirements=body.requirements,
        salary_range=body.salary_range,
        min_experience=body.min_experience,
        required_skills=json.dumps(body.required_skills or [], ensure_ascii=False),
        is_active=True,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return _job_to_dict(job, db)


@router.patch("/jobs/{job_id}")
def update_job(
    job_id: int,
    body: JobUpdateBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    member = _get_company_member(db, current_user)
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.company_id == member.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if body.title is not None:
        job.title = body.title
    if body.job_type is not None:
        job.job_type = body.job_type
    if body.location is not None:
        job.location = body.location
    if body.description is not None:
        job.description = body.description
    if body.requirements is not None:
        job.requirements = body.requirements
    if body.salary_range is not None:
        job.salary_range = body.salary_range
    if body.min_experience is not None:
        job.min_experience = body.min_experience
    if body.required_skills is not None:
        job.required_skills = json.dumps(body.required_skills, ensure_ascii=False)
    if body.is_active is not None:
        job.is_active = body.is_active

    db.commit()
    db.refresh(job)
    return _job_to_dict(job, db)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    member = _get_company_member(db, current_user)
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.company_id == member.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.is_active = False
    db.commit()


@router.get("/jobs/{job_id}/applicants")
def list_job_applicants(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    member = _get_company_member(db, current_user)
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.company_id == member.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    apps = (
        db.query(JobApplication)
        .filter(JobApplication.job_id == job_id)
        .order_by(JobApplication.created_at.desc())
        .all()
    )
    return [_app_to_dict(a, db) for a in apps]


@router.patch("/applications/{app_id}/stage")
def update_application_stage(
    app_id: int,
    body: StageUpdateBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    member = _get_company_member(db, current_user)

    app = db.query(JobApplication).filter(JobApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Verify the application belongs to a job in the user's company
    job = db.query(JobPosting).filter(
        JobPosting.id == app.job_id,
        JobPosting.company_id == member.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=403, detail="Not authorized to manage this application")

    # Accept either `stage` or `status` field (backward compat)
    new_stage = body.stage or body.status
    if not new_stage:
        raise HTTPException(status_code=400, detail="stage or status field required")
    if new_stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Valid: {', '.join(VALID_STAGES)}")

    app.status = new_stage
    db.commit()
    db.refresh(app)
    return _app_to_dict(app, db)


@router.patch("/applications/{app_id}/note")
def update_application_note(
    app_id: int,
    body: NoteUpdateBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    member = _get_company_member(db, current_user)

    app = db.query(JobApplication).filter(JobApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job = db.query(JobPosting).filter(
        JobPosting.id == app.job_id,
        JobPosting.company_id == member.company_id,
    ).first()
    if not job:
        raise HTTPException(status_code=403, detail="Not authorized to manage this application")

    # Mark as reviewed if still pending
    if app.status == "pending":
        app.status = "reviewed"

    db.commit()
    db.refresh(app)
    return _app_to_dict(app, db)


@router.get("/talent-pool")
def talent_pool(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
):
    _get_company_member(db, current_user)  # auth check only

    query = db.query(User, UserCV).join(UserCV, UserCV.user_id == User.id)

    rows = query.limit(limit).all()

    result = []
    for u, cv in rows:
        if search:
            haystack = f"{u.name or ''} {cv.title or ''} {cv.location or ''} {cv.skills or ''}".lower()
            if search.lower() not in haystack:
                continue
        result.append({
            "user_id": u.id,
            "name": u.name or cv.full_name,
            "username": u.username,
            "avatar_url": u.avatar_url,
            "title": cv.title,
            "location": cv.location or u.location,
            "years_experience": cv.years_experience,
            "skills": _parse_json_field(cv.skills),
            "summary": cv.summary,
        })

    return result
