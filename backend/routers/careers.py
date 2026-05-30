from __future__ import annotations

import json
from typing import Annotated, Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user, decode_token
from database import get_db
from models import User, Company, JobPosting, JobApplication, UserCV

router = APIRouter(prefix="/careers", tags=["careers"])

# ─── Optional auth helper ────────────────────────────────────────────────────

_security_scheme = HTTPBearer(auto_error=False)


def optional_get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_security_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Returns the authenticated user or None — does not raise on missing/invalid token."""
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if not payload:
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _parse_json_field(value: Optional[str]) -> list:
    if not value:
        return []
    try:
        return json.loads(value)
    except Exception:
        return [value]


def _job_to_dict(
    job: JobPosting,
    db: Session,
    current_user: Optional[User] = None,
    include_requirements: bool = False,
) -> dict:
    apps_count = db.query(JobApplication).filter(JobApplication.job_id == job.id).count()
    applied_by_me = False
    if current_user:
        applied_by_me = (
            db.query(JobApplication)
            .filter(
                JobApplication.job_id == job.id,
                JobApplication.user_id == current_user.id,
            )
            .first()
            is not None
        )
    data = {
        "id": job.id,
        "title": job.title,
        "company_name": job.company.name if job.company else None,
        "company_logo": job.company.logo_url if job.company else None,
        "job_type": job.job_type,
        "location": job.location,
        "salary_range": job.salary_range,
        "min_experience": job.min_experience,
        "description": job.description,
        "applications_count": apps_count,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "applied_by_me": applied_by_me,
    }
    if include_requirements:
        data["requirements"] = job.requirements
        data["required_skills"] = _parse_json_field(job.required_skills)
    return data


def _cv_to_dict(cv: UserCV) -> dict:
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


# ─── Schemas ─────────────────────────────────────────────────────────────────

class ApplyBody(BaseModel):
    cover_letter: Optional[str] = None


class CVUpsertBody(BaseModel):
    full_name: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    years_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    education: Optional[List[dict]] = None
    certifications: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/jobs")
def list_public_jobs(
    db: Annotated[Session, Depends(get_db)],
    current_user: Optional[User] = Depends(optional_get_current_user),
    search: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    job_type: Optional[str] = Query(None),
    limit: int = Query(30, le=100),
    offset: int = Query(0),
):
    q = db.query(JobPosting).filter(JobPosting.is_active == True)
    if search:
        q = q.filter(
            JobPosting.title.ilike(f"%{search}%") |
            JobPosting.description.ilike(f"%{search}%")
        )
    if location:
        q = q.filter(JobPosting.location.ilike(f"%{location}%"))
    if job_type:
        q = q.filter(JobPosting.job_type == job_type)

    jobs = q.order_by(JobPosting.created_at.desc()).offset(offset).limit(limit).all()
    return [_job_to_dict(j, db, current_user) for j in jobs]


@router.get("/jobs/{job_id}")
def get_public_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Optional[User] = Depends(optional_get_current_user),
):
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.is_active == True,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_to_dict(job, db, current_user, include_requirements=True)


@router.post("/jobs/{job_id}/apply", status_code=status.HTTP_201_CREATED)
def apply_to_job(
    job_id: int,
    body: ApplyBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.is_active == True,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or inactive")

    existing = db.query(JobApplication).filter(
        JobApplication.job_id == job_id,
        JobApplication.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this job")

    app = JobApplication(
        job_id=job_id,
        user_id=current_user.id,
        cover_letter=body.cover_letter,
        status="pending",
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    return {
        "id": app.id,
        "status": app.status,
        "applied_at": app.created_at.isoformat() if app.created_at else None,
    }


@router.get("/applications/me")
def my_applications(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    apps = (
        db.query(JobApplication)
        .filter(JobApplication.user_id == current_user.id)
        .order_by(JobApplication.created_at.desc())
        .all()
    )
    result = []
    for a in apps:
        job = a.job
        result.append({
            "id": a.id,
            "job_id": a.job_id,
            "job_title": job.title if job else None,
            "company_name": job.company.name if job and job.company else None,
            "company_logo": job.company.logo_url if job and job.company else None,
            "status": a.status,
            "cover_letter": a.cover_letter,
            "applied_at": a.created_at.isoformat() if a.created_at else None,
        })
    return result


@router.get("/profile")
def get_my_cv(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    cv = db.query(UserCV).filter(UserCV.user_id == current_user.id).first()
    if not cv:
        return {}
    return _cv_to_dict(cv)


@router.put("/profile")
def upsert_my_cv(
    body: CVUpsertBody,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    cv = db.query(UserCV).filter(UserCV.user_id == current_user.id).first()

    def _to_json(v) -> Optional[str]:
        if v is None:
            return None
        return json.dumps(v, ensure_ascii=False)

    if cv is None:
        cv = UserCV(
            user_id=current_user.id,
            full_name=body.full_name,
            title=body.title,
            summary=body.summary,
            phone=body.phone,
            email=body.email,
            location=body.location,
            years_experience=body.years_experience,
            skills=_to_json(body.skills),
            education=_to_json(body.education),
            certifications=_to_json(body.certifications),
            languages=_to_json(body.languages),
            linkedin_url=body.linkedin_url,
            portfolio_url=body.portfolio_url,
        )
        db.add(cv)
    else:
        if body.full_name is not None:
            cv.full_name = body.full_name
        if body.title is not None:
            cv.title = body.title
        if body.summary is not None:
            cv.summary = body.summary
        if body.phone is not None:
            cv.phone = body.phone
        if body.email is not None:
            cv.email = body.email
        if body.location is not None:
            cv.location = body.location
        if body.years_experience is not None:
            cv.years_experience = body.years_experience
        if body.skills is not None:
            cv.skills = _to_json(body.skills)
        if body.education is not None:
            cv.education = _to_json(body.education)
        if body.certifications is not None:
            cv.certifications = _to_json(body.certifications)
        if body.languages is not None:
            cv.languages = _to_json(body.languages)
        if body.linkedin_url is not None:
            cv.linkedin_url = body.linkedin_url
        if body.portfolio_url is not None:
            cv.portfolio_url = body.portfolio_url

    db.commit()
    db.refresh(cv)
    return _cv_to_dict(cv)
