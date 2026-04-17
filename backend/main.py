from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
import random

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

# ALLOUL&Q — Initialize Sentry BEFORE importing app modules so
# errors during startup are captured too.
from services.sentry import init_sentry
init_sentry()

import database
from config import settings
from database import engine, Base
from routers import (
    auth, companies, webhooks, upload,
    handover, memory, deals,
    dashboard, search, agent, daily_workspace, admin,
    projects, notifications, phone,
    meetings, channels, cv, job_postings, calls,
    ai_extract, ai_confirm, security, ai_system, ai_monitoring, settings as settings_router, employees,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ALLOUL&Q — Production schema is managed via Alembic migrations.
    # Run `./scripts/migrate.sh up` to apply migrations.
    # For local dev only, create_all() runs if ALLOW_CREATE_ALL=1
    import os as _os
    if _os.getenv("ALLOW_CREATE_ALL") == "1":
        Base.metadata.create_all(bind=engine)
    _validate_runtime_safety()
    _seed_bootstrap_users()
    yield


def _generate_user_icode(db) -> str:
    from models import User

    count = db.query(User).count()
    if count < 100_000:
        lo, hi = 10_000_000, 99_999_999
    elif count < 1_000_000:
        lo, hi = 1_000_000_000, 9_999_999_999
    else:
        lo, hi = 100_000_000_000, 999_999_999_999
    for _ in range(200):
        code = str(random.randint(lo, hi))
        if not db.query(User).filter(User.i_code == code).first():
            return code
    raise RuntimeError("Unable to generate unique i_code")


def _create_password_user_if_missing(
    db,
    *,
    email: str,
    username: str,
    password: str,
    display_name: str,
) -> None:
    """Idempotent: skip if username or email already exists."""
    from auth import get_password_hash
    from models import User

    if db.query(User).filter(User.username == username).first():
        return
    if db.query(User).filter(User.email == email).first():
        return
    user = User(
        email=email,
        username=username,
        hashed_password=get_password_hash(password),
        name=display_name,
        i_code=_generate_user_icode(db),
    )
    db.add(user)
    db.commit()


def _seed_bootstrap_users():
    """Create seeded users when enabled (admin + optional second account for multi-device QA)."""
    db = next(database.get_db())
    try:
        if settings.SEED_ADMIN_ENABLED:
            if not settings.SEED_ADMIN_EMAIL or not settings.SEED_ADMIN_PASSWORD:
                raise RuntimeError(
                    "SEED_ADMIN_ENABLED=true requires both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD"
                )
            if len(settings.SEED_ADMIN_PASSWORD) < 12:
                raise RuntimeError("SEED_ADMIN_PASSWORD must be at least 12 characters")
            try:
                _create_password_user_if_missing(
                    db,
                    email=settings.SEED_ADMIN_EMAIL,
                    username=settings.SEED_ADMIN_USERNAME,
                    password=settings.SEED_ADMIN_PASSWORD,
                    display_name="Admin",
                )
            except Exception:
                db.rollback()

        if settings.SEED_SECOND_USER_ENABLED:
            if not settings.SEED_SECOND_USER_EMAIL or not settings.SEED_SECOND_USER_PASSWORD:
                raise RuntimeError(
                    "SEED_SECOND_USER_ENABLED=true requires SEED_SECOND_USER_EMAIL and SEED_SECOND_USER_PASSWORD"
                )
            if len(settings.SEED_SECOND_USER_PASSWORD) < 8:
                raise RuntimeError("SEED_SECOND_USER_PASSWORD must be at least 8 characters")
            name = settings.SEED_SECOND_USER_NAME or settings.SEED_SECOND_USER_USERNAME
            try:
                _create_password_user_if_missing(
                    db,
                    email=settings.SEED_SECOND_USER_EMAIL,
                    username=settings.SEED_SECOND_USER_USERNAME,
                    password=settings.SEED_SECOND_USER_PASSWORD,
                    display_name=name,
                )
            except Exception:
                db.rollback()
    finally:
        db.close()


def _validate_runtime_safety() -> None:
    env = settings.ENVIRONMENT.lower()
    if env in {"prod", "production"}:
        if settings.SECRET_KEY == "change-me-in-production-use-openssl-rand-hex-32":
            raise RuntimeError("SECRET_KEY must be set in production")
        if "*" in settings.CORS_ORIGINS:
            raise RuntimeError("CORS_ORIGINS cannot include '*' in production")


app = FastAPI(
    title="Alloul One API",
    lifespan=lifespan,
)
allow_all_origins = "*" in settings.CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else [],
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ALLOUL&Q — Audit logging for compliance (GDPR/PDPL)
from middleware import AuditMiddleware  # noqa: E402
app.add_middleware(AuditMiddleware)

# Core routers (always included)
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(webhooks.router)
app.include_router(upload.router)
app.include_router(handover.router)
app.include_router(memory.router)
app.include_router(deals.router)
app.include_router(dashboard.router)
app.include_router(search.router)
app.include_router(agent.router)
app.include_router(daily_workspace.router)
app.include_router(admin.router)
app.include_router(projects.router)
app.include_router(notifications.router)
app.include_router(phone.router)
app.include_router(meetings.router)
app.include_router(channels.router)
app.include_router(cv.router)
app.include_router(job_postings.router)
app.include_router(ai_extract.router)
app.include_router(ai_confirm.router)
app.include_router(ai_system.router)
app.include_router(security.router)
app.include_router(ai_monitoring.router)
app.include_router(settings_router.router)
app.include_router(calls.router)
app.include_router(employees.router)


@app.get("/")
def root():
    return {
        "name": "Alloul One API",
        "health": "/health",
        "docs": "/docs",
        "auth": {"login": "POST /auth/login", "register": "POST /auth/register", "me": "GET /auth/me"},
    }


@app.get("/health")
def health():
    return {"status": "ok"}
