from __future__ import annotations
import json
from typing import Annotated, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from auth import get_current_user
from database import get_db
from models import User, Company, CompanyMember, JobPosting, JobApplication, UserCV
from company_categories import COMPANY_INDUSTRIES, JOB_TITLES

router = APIRouter(prefix="/jobs", tags=["jobs"])

class JobPostRequest(BaseModel):
    title: str
    industry: Optional[str] = None
    job_type: str = "full_time"
    location: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    required_skills: Optional[List[str]] = None
    min_experience: Optional[int] = None

class JobPostResponse(BaseModel):
    id: int
    company_id: int
    company_name: Optional[str] = None
    company_industry: Optional[str] = None
    title: str
    industry: Optional[str] = None
    job_type: str
    location: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    required_skills: Optional[List[str]] = None
    min_experience: Optional[int] = None
    applications_count: int = 0
    is_active: bool = True
    created_at: Optional[str] = None
    applied_by_me: bool = False
    class Config:
        from_attributes = True

class ApplyRequest(BaseModel):
    cover_letter: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    applicant_id: int
    applicant_name: Optional[str] = None
    applicant_username: Optional[str] = None
    cover_letter: Optional[str] = None
    status: str
    created_at: Optional[str] = None
    class Config:
        from_attributes = True

def _job_to_response(job: JobPosting, db: Session, user_id: int) -> JobPostResponse:
    apps_count = db.query(JobApplication).filter(JobApplication.job_id == job.id).count()
    applied = db.query(JobApplication).filter(JobApplication.job_id == job.id, JobApplication.user_id == user_id).first() is not None
    skills = []
    if job.required_skills:
        try: skills = json.loads(job.required_skills)
        except: skills = [job.required_skills]
    return JobPostResponse(
        id=job.id, company_id=job.company_id,
        company_name=job.company.name if job.company else None,
        company_industry=job.company.industry if job.company else None,
        title=job.title, industry=job.industry, job_type=job.job_type,
        location=job.location, description=job.description,
        requirements=job.requirements, salary_range=job.salary_range,
        required_skills=skills, min_experience=job.min_experience,
        applications_count=apps_count, is_active=job.is_active,
        created_at=job.created_at.isoformat() if job.created_at else None,
        applied_by_me=applied,
    )

@router.get("/categories")
def get_categories():
    return {"industries": COMPANY_INDUSTRIES, "job_titles": JOB_TITLES}

@router.get("/my-applications", response_model=List[ApplicationResponse])
def my_applications(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    apps = db.query(JobApplication).filter(JobApplication.user_id == current_user.id).order_by(JobApplication.created_at.desc()).all()
    result = []
    for a in apps:
        job = a.job
        result.append(ApplicationResponse(
            id=a.id, job_id=a.job_id,
            job_title=job.title if job else None,
            company_name=job.company.name if job and job.company else None,
            applicant_id=a.user_id,
            applicant_name=current_user.name or current_user.username,
            applicant_username=current_user.username,
            cover_letter=a.cover_letter, status=a.status,
            created_at=a.created_at.isoformat() if a.created_at else None,
        ))
    return result

@router.get("/my-company", response_model=List[JobPostResponse])
def list_my_company_jobs(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Not a company member")
    jobs = db.query(JobPosting).filter(JobPosting.company_id == member.company_id).order_by(JobPosting.created_at.desc()).all()
    return [_job_to_response(j, db, current_user.id) for j in jobs]

@router.get("/", response_model=List[JobPostResponse])
def list_jobs(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    limit: int = Query(30, le=100),
    offset: int = Query(0),
):
    q = db.query(JobPosting).filter(JobPosting.is_active == True)
    if search:
        q = q.filter(JobPosting.title.ilike(f"%{search}%"))
    if industry:
        q = q.filter(JobPosting.industry == industry)
    jobs = q.order_by(JobPosting.created_at.desc()).offset(offset).limit(limit).all()
    return [_job_to_response(j, db, current_user.id) for j in jobs]

@router.post("/", response_model=JobPostResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    body: JobPostRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    if not member or member.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="Only company admins can post jobs")
    job = JobPosting(
        company_id=member.company_id,
        posted_by=current_user.id,
        title=body.title,
        industry=body.industry,
        job_type=body.job_type,
        location=body.location,
        description=body.description,
        requirements=body.requirements,
        salary_range=body.salary_range,
        required_skills=json.dumps(body.required_skills or [], ensure_ascii=False),
        min_experience=body.min_experience,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return _job_to_response(job, db, current_user.id)

class SeekerProfile(BaseModel):
    user_id: int
    username: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    years_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    summary: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    class Config:
        from_attributes = True


@router.get("/seekers", response_model=List[SeekerProfile])
def list_job_seekers(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
):
    """List all users with account_type='job_seeker' who have a CV."""
    import json as _json
    seekers = (
        db.query(User, UserCV)
        .join(UserCV, UserCV.user_id == User.id)
        .filter(User.account_type == "job_seeker")
        .limit(limit)
        .all()
    )
    def _parse(v):
        if not v: return []
        try: return _json.loads(v)
        except: return [v]

    result = []
    for u, cv in seekers:
        if search:
            haystack = f"{u.name or ''} {cv.title or ''} {cv.location or ''} {cv.skills or ''}".lower()
            if search.lower() not in haystack:
                continue
        result.append(SeekerProfile(
            user_id=u.id, username=u.username, name=u.name or cv.full_name,
            avatar_url=u.avatar_url, title=cv.title, location=cv.location or u.location,
            years_experience=cv.years_experience, skills=_parse(cv.skills),
            languages=_parse(cv.languages), summary=cv.summary,
            linkedin_url=cv.linkedin_url, portfolio_url=cv.portfolio_url,
            phone=cv.phone, email=cv.email,
        ))
    return result

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id, CompanyMember.company_id == job.company_id).first()
    if not member or member.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(job)
    db.commit()

@router.post("/{job_id}/apply", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_job(
    job_id: int,
    body: ApplyRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    job = db.query(JobPosting).filter(JobPosting.id == job_id, JobPosting.is_active == True).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    existing = db.query(JobApplication).filter(JobApplication.job_id == job_id, JobApplication.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already applied")
    app = JobApplication(job_id=job_id, user_id=current_user.id, cover_letter=body.cover_letter)
    db.add(app)
    db.commit()
    db.refresh(app)
    return ApplicationResponse(
        id=app.id, job_id=app.job_id, job_title=job.title,
        company_name=job.company.name if job.company else None,
        applicant_id=current_user.id,
        applicant_name=current_user.name or current_user.username,
        applicant_username=current_user.username,
        cover_letter=app.cover_letter, status=app.status,
        created_at=app.created_at.isoformat() if app.created_at else None,
    )

@router.get("/{job_id}/applications", response_model=List[ApplicationResponse])
def list_applications(
    job_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id, CompanyMember.company_id == job.company_id).first()
    if not member or member.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized")
    apps = db.query(JobApplication).filter(JobApplication.job_id == job_id).all()
    result = []
    for a in apps:
        u = a.applicant
        result.append(ApplicationResponse(
            id=a.id, job_id=a.job_id, job_title=job.title,
            company_name=job.company.name if job.company else None,
            applicant_id=a.user_id,
            applicant_name=u.name or u.username if u else None,
            applicant_username=u.username if u else None,
            cover_letter=a.cover_letter, status=a.status,
            created_at=a.created_at.isoformat() if a.created_at else None,
        ))
    return result

@router.patch("/{job_id}/applications/{app_id}", response_model=ApplicationResponse)
def update_application_status(
    job_id: int,
    app_id: int,
    status_val: str = Query(..., alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(JobApplication).filter(JobApplication.id == app_id, JobApplication.job_id == job_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    job = app.job
    member = db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id, CompanyMember.company_id == job.company_id).first()
    if not member or member.role not in ("owner", "admin", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if status_val not in ("pending", "reviewed", "accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status")
    app.status = status_val
    db.commit()
    u = app.applicant
    return ApplicationResponse(
        id=app.id, job_id=app.job_id, job_title=job.title,
        company_name=job.company.name if job.company else None,
        applicant_id=app.user_id,
        applicant_name=u.name or u.username if u else None,
        applicant_username=u.username if u else None,
        cover_letter=app.cover_letter, status=app.status,
        created_at=app.created_at.isoformat() if app.created_at else None,
    )

