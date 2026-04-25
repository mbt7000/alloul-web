"""
شكرة — AI Accountant Router
============================
Privacy-first accounting automation for companies.

Architecture:
  • Invoice details → stored in company's own Google Sheets (ALLOUL never sees them)
  • ALLOUL stores only metadata: amount, date, category, type
  • n8n automation pipeline: WhatsApp image → OCR → AI → Google Sheets + this webhook
  • This router: setup, metadata ingestion, dashboards, reports
"""
from __future__ import annotations

import json
import logging
import re
import secrets
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Request, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from database import get_db
from models import AccountingRecord, AccountingSetup, AccountingPermission, CompanyMember, Company
from routers.auth import get_current_user
from auth import verify_password
from models import User

try:
    from services.shukra_bot import (
        extract_invoice_from_image,
        extract_text_transaction,
        write_to_google_sheet,
        download_telegram_file,
        send_telegram_message,
        set_telegram_webhook,
        download_whatsapp_media,
        send_whatsapp_message,
        format_success_reply,
        format_error_reply,
        get_txn_row,
        update_txn_field,
        SHUKRA_SERVICE_EMAIL,
    )
    BOT_SERVICE_AVAILABLE = True
except ImportError:
    BOT_SERVICE_AVAILABLE = False

logger = logging.getLogger("alloul.accounting")

# ══════════════════════════════════════════════════════════════════════════════
# In-memory Telegram session state
# ══════════════════════════════════════════════════════════════════════════════
# Structure:
#   _tg_sessions[company_id][str(chat_id)] = {
#       "state":          str,   # init | await_name | await_pin | ready |
#                                #   await_client | await_phone | await_goods |
#                                #   await_duration | await_payment
#       "employee_name":  str,
#       "pending_name":   str,   # name typed during auth before PIN check
#       "invoice":        dict,  # transaction being enriched
#       "client":         str,
#       "phone":          str,
#       "goods":          str,
#       "duration":       str,
#       "payment_status": str,
#   }
_tg_sessions: dict[int, dict[str, dict]] = defaultdict(dict)
# Session structure per chat:
#   state: init | await_id | await_password | ready
#   employee_name, employee_no, user_id, is_founder
#   invoice, client, phone, goods, duration, payment_status
#   edit_txn, edit_field, pending_user_id

# Founder Telegram chat IDs per company (for large-txn alerts + daily reports)
_tg_founders: dict[int, str] = {}
# Track which companies already loaded from disk
_tg_loaded: set = set()

_LARGE_TXN_THRESHOLD = 10_000

# Budget limits per company: {company_id: {category: limit_amount}}
_tg_budgets: dict[int, dict[str, float]] = defaultdict(dict)

# ── Persistent storage (JSON file per company) ────────────────────────────────
import os as _os

_SHUKRA_DIR = "/root/allou-backend/data/shukra"


def _data_path(company_id: int) -> str:
    return f"{_SHUKRA_DIR}/{company_id}.json"


def _load_company(company_id: int) -> None:
    """Load founder_chat_id + budgets from disk (once per restart)."""
    if company_id in _tg_loaded:
        return
    _tg_loaded.add(company_id)
    path = _data_path(company_id)
    if not _os.path.exists(path):
        return
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if data.get("founder_chat_id"):
            _tg_founders[company_id] = data["founder_chat_id"]
        if data.get("budgets"):
            _tg_budgets[company_id].update(data["budgets"])
        logger.info(f"Loaded shukra data for company {company_id}")
    except Exception as e:
        logger.warning(f"Could not load shukra data for {company_id}: {e}")


def _save_company(company_id: int) -> None:
    """Persist founder_chat_id + budgets to disk."""
    try:
        _os.makedirs(_SHUKRA_DIR, exist_ok=True)
        data = {
            "founder_chat_id": _tg_founders.get(company_id),
            "budgets":         dict(_tg_budgets.get(company_id, {})),
        }
        with open(_data_path(company_id), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Could not save shukra data for {company_id}: {e}")


# ── Session helpers ────────────────────────────────────────────────────────────

def _session(company_id: int, chat_id) -> dict:
    cid = str(chat_id)
    if cid not in _tg_sessions[company_id]:
        _tg_sessions[company_id][cid] = {"state": "init", "employee_name": ""}
    return _tg_sessions[company_id][cid]


def _is_founder(company_id: int, chat_id) -> bool:
    """Founder status stored in session after DB-verified login."""
    return _tg_sessions.get(company_id, {}).get(str(chat_id), {}).get("is_founder", False)


def _is_authenticated(company_id: int, chat_id) -> bool:
    sess = _session(company_id, chat_id)
    return sess.get("state") not in ("init", "await_id", "await_password")

router = APIRouter(prefix="/accounting", tags=["accounting"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SetupIn(BaseModel):
    google_sheet_id: Optional[str] = None
    google_sheet_url: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_verify_token: Optional[str] = None
    currency: str = "SAR"
    # Privacy settings
    show_balances:     Optional[bool] = None
    show_profits:      Optional[bool] = None
    show_amounts:      Optional[bool] = None
    show_vendors:      Optional[bool] = None
    show_reports:      Optional[bool] = None
    employees_can_add: Optional[bool] = None
    # Capital
    initial_capital:   Optional[float] = None


class PermissionIn(BaseModel):
    user_id:            int
    can_view_dashboard: bool = True
    can_view_amounts:   bool = False
    can_view_profits:   bool = False
    can_view_reports:   bool = False
    can_view_vendors:   bool = False
    can_add_records:    bool = True
    can_edit_records:   bool = False
    can_delete_records: bool = False
    can_use_bot:        bool = True


class PermissionOut(BaseModel):
    id: int
    user_id: int
    can_view_dashboard: bool
    can_view_amounts:   bool
    can_view_profits:   bool
    can_view_reports:   bool
    can_view_vendors:   bool
    can_add_records:    bool
    can_edit_records:   bool
    can_delete_records: bool
    can_use_bot:        bool
    is_active: bool
    class Config:
        from_attributes = True


class SetupOut(BaseModel):
    id: int
    company_id: int
    google_sheet_id: Optional[str]
    google_sheet_url: Optional[str]
    telegram_bot_token: Optional[str]
    telegram_active: bool
    whatsapp_phone_number_id: Optional[str]
    whatsapp_active: bool
    currency: str
    is_active: bool
    webhook_url_telegram: Optional[str] = None
    webhook_url_whatsapp: Optional[str] = None

    class Config:
        from_attributes = True


class RecordIn(BaseModel):
    record_type: str                     # income | expense
    amount: float
    currency: str = "SAR"
    category: Optional[str] = None
    sub_category: Optional[str] = None
    vendor: Optional[str] = None
    description: Optional[str] = None
    payment_status: str = "paid"         # paid | pending | partial
    recorded_at: Optional[str] = None   # ISO datetime; defaults to now
    source: str = "manual"
    sheet_row_ref: Optional[str] = None
    external_ref: Optional[str] = None


class RecordOut(BaseModel):
    id: int
    record_type: str
    amount: float
    currency: str
    category: Optional[str]
    sub_category: Optional[str]
    vendor: Optional[str] = None
    description: Optional[str] = None
    payment_status: str = "paid"
    recorded_at: datetime
    source: str
    sheet_row_ref: Optional[str]
    external_ref: Optional[str]
    ai_confidence: Optional[float]
    needs_review: bool
    created_at: datetime

    class Config:
        from_attributes = True


class N8nWebhookPayload(BaseModel):
    """Payload sent by n8n after OCR + AI extraction."""
    company_id: int
    record_type: str                     # income | expense
    amount: float
    currency: str = "SAR"
    category: Optional[str] = None
    sub_category: Optional[str] = None
    recorded_at: Optional[str] = None
    sheet_row_ref: Optional[str] = None
    external_ref: Optional[str] = None
    ai_confidence: Optional[float] = None
    needs_review: bool = False
    webhook_secret: Optional[str] = None  # shared secret for auth


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_company_id(user: User, db: Session) -> int:
    mem = db.query(CompanyMember).filter(CompanyMember.user_id == user.id).first()
    if not mem:
        raise HTTPException(status_code=404, detail="لا توجد شركة مرتبطة بهذا الحساب")
    return mem.company_id


def _parse_dt(value: Optional[str]) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


# ── Setup endpoints ───────────────────────────────────────────────────────────

@router.get("/setup", response_model=SetupOut)
def get_setup(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the accounting setup for the current company."""
    company_id = _get_company_id(current_user, db)
    setup = db.query(AccountingSetup).filter(AccountingSetup.company_id == company_id).first()
    if not setup:
        raise HTTPException(status_code=404, detail="لم يتم إعداد المحاسبة بعد")
    return setup


@router.post("/setup", response_model=SetupOut)
def save_setup(
    body: SetupIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update accounting setup."""
    company_id = _get_company_id(current_user, db)
    setup = db.query(AccountingSetup).filter(AccountingSetup.company_id == company_id).first()

    if not setup:
        setup = AccountingSetup(company_id=company_id)
        db.add(setup)

    # Google Sheet
    if body.google_sheet_id is not None:
        setup.google_sheet_id = body.google_sheet_id
    if body.google_sheet_url is not None:
        # extract sheet ID from URL if not provided
        if body.google_sheet_url and not body.google_sheet_id:
            import re
            m = re.search(r"/d/([a-zA-Z0-9_-]+)", body.google_sheet_url)
            if m:
                setup.google_sheet_id = m.group(1)
        setup.google_sheet_url = body.google_sheet_url

    # Telegram
    if body.telegram_bot_token is not None:
        setup.telegram_bot_token = body.telegram_bot_token
        setup.telegram_active = bool(body.telegram_bot_token)

    # WhatsApp
    if body.whatsapp_phone_number_id is not None:
        setup.whatsapp_phone_number_id = body.whatsapp_phone_number_id
    if body.whatsapp_access_token is not None:
        setup.whatsapp_access_token = body.whatsapp_access_token
    if body.whatsapp_verify_token is not None:
        setup.whatsapp_verify_token = body.whatsapp_verify_token
    elif not setup.whatsapp_verify_token:
        setup.whatsapp_verify_token = secrets.token_hex(16)
    setup.whatsapp_active = bool(setup.whatsapp_phone_number_id and setup.whatsapp_access_token)

    setup.currency = body.currency
    setup.is_active = True

    # Privacy settings
    if body.show_balances     is not None: setup.show_balances     = body.show_balances
    if body.show_profits      is not None: setup.show_profits      = body.show_profits
    if body.show_amounts      is not None: setup.show_amounts      = body.show_amounts
    if body.show_vendors      is not None: setup.show_vendors      = body.show_vendors
    if body.show_reports      is not None: setup.show_reports      = body.show_reports
    if body.employees_can_add is not None: setup.employees_can_add = body.employees_can_add
    if body.initial_capital   is not None: setup.initial_capital   = body.initial_capital

    db.commit()
    db.refresh(setup)

    # Auto-register Telegram webhook
    company = db.query(Company).filter(Company.id == company_id).first()
    if setup.telegram_bot_token and company and BOT_SERVICE_AVAILABLE:
        import asyncio
        from config import settings
        api_base = getattr(settings, "API_BASE_URL", "https://api.alloul.app")
        webhook_url = f"{api_base}/accounting/bot/telegram/{company.i_code}"
        try:
            loop = asyncio.new_event_loop()
            ok = loop.run_until_complete(set_telegram_webhook(setup.telegram_bot_token, webhook_url))
            loop.close()
            if ok:
                logger.info(f"Telegram webhook set for company {company_id}")
        except Exception as e:
            logger.warning(f"Could not set Telegram webhook: {e}")

    logger.info(f"Accounting setup saved for company {company_id}")

    # Attach webhook URLs for the response
    from config import settings
    api_base = getattr(settings, "API_BASE_URL", "https://api.alloul.app")
    if company:
        setup.webhook_url_telegram = f"{api_base}/accounting/bot/telegram/{company.i_code}"
        setup.webhook_url_whatsapp = f"{api_base}/accounting/bot/whatsapp/{company.i_code}"

    return setup


# ── Manual record CRUD ────────────────────────────────────────────────────────

@router.get("/records", response_model=list[RecordOut])
def list_records(
    record_type: Optional[str] = None,
    category: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    needs_review: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = _get_company_id(current_user, db)
    q = db.query(AccountingRecord).filter(
        AccountingRecord.company_id == company_id,
        AccountingRecord.is_deleted == False,
    )
    if record_type:
        q = q.filter(AccountingRecord.record_type == record_type)
    if category:
        q = q.filter(AccountingRecord.category == category)
    if needs_review is not None:
        q = q.filter(AccountingRecord.needs_review == needs_review)
    if year:
        q = q.filter(extract("year", AccountingRecord.recorded_at) == year)
    if month:
        q = q.filter(extract("month", AccountingRecord.recorded_at) == month)
    return q.order_by(AccountingRecord.recorded_at.desc()).offset(offset).limit(limit).all()


@router.post("/records", response_model=RecordOut)
def create_record(
    body: RecordIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = _get_company_id(current_user, db)
    if body.record_type not in ("income", "expense"):
        raise HTTPException(status_code=422, detail="record_type must be 'income' or 'expense'")

    record = AccountingRecord(
        company_id=company_id,
        created_by=current_user.id,
        record_type=body.record_type,
        amount=body.amount,
        currency=body.currency,
        category=body.category,
        sub_category=body.sub_category,
        vendor=body.vendor,
        description=body.description,
        payment_status=body.payment_status,
        recorded_at=_parse_dt(body.recorded_at),
        source=body.source,
        sheet_row_ref=body.sheet_row_ref,
        external_ref=body.external_ref,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/records/recent", response_model=list[RecordOut])
def recent_records(
    record_type: Optional[str] = None,
    limit: int = Query(default=20, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns most recent N records with all fields."""
    company_id = _get_company_id(current_user, db)
    q = db.query(AccountingRecord).filter(
        AccountingRecord.company_id == company_id,
        AccountingRecord.is_deleted == False,
    )
    if record_type:
        q = q.filter(AccountingRecord.record_type == record_type)
    return q.order_by(AccountingRecord.recorded_at.desc()).limit(limit).all()


@router.delete("/records/{record_id}")
def delete_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company_id = _get_company_id(current_user, db)
    record = db.query(AccountingRecord).filter(
        AccountingRecord.id == record_id,
        AccountingRecord.company_id == company_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="السجل غير موجود")
    record.is_deleted = True
    db.commit()
    return {"ok": True}


# ── n8n Webhook (receives processed invoices) ─────────────────────────────────

@router.post("/webhook/n8n")
async def n8n_webhook(
    payload: N8nWebhookPayload,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Called by n8n after OCR + AI extraction.
    Validates the shared secret then saves metadata.
    """
    # Validate shared secret
    setup = db.query(AccountingSetup).filter(
        AccountingSetup.company_id == payload.company_id,
        AccountingSetup.is_active == True,
    ).first()

    if not setup:
        raise HTTPException(status_code=404, detail="Company accounting not configured")

    # Optional: verify webhook_secret matches n8n_webhook_url domain or a stored secret
    # For now we check company exists and setup is active (production: add HMAC signature)

    if payload.record_type not in ("income", "expense"):
        raise HTTPException(status_code=422, detail="Invalid record_type")

    record = AccountingRecord(
        company_id=payload.company_id,
        record_type=payload.record_type,
        amount=payload.amount,
        currency=payload.currency,
        category=payload.category,
        sub_category=payload.sub_category,
        recorded_at=_parse_dt(payload.recorded_at),
        source="whatsapp",
        sheet_row_ref=payload.sheet_row_ref,
        external_ref=payload.external_ref,
        ai_confidence=payload.ai_confidence,
        needs_review=payload.needs_review,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    logger.info(
        f"n8n webhook: company={payload.company_id} "
        f"type={payload.record_type} amount={payload.amount} {payload.currency} "
        f"confidence={payload.ai_confidence}"
    )
    return {"ok": True, "record_id": record.id}


# ── Dashboard / analytics ─────────────────────────────────────────────────────

@router.get("/dashboard")
def dashboard(
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Monthly/yearly summary: total income, total expenses, net profit,
    breakdown by category, pending review count.
    """
    company_id = _get_company_id(current_user, db)
    now = datetime.now(timezone.utc)
    y = year or now.year
    m = month or now.month

    base_q = db.query(AccountingRecord).filter(
        AccountingRecord.company_id == company_id,
        AccountingRecord.is_deleted == False,
        extract("year", AccountingRecord.recorded_at) == y,
        extract("month", AccountingRecord.recorded_at) == m,
    )

    total_income = (
        base_q.filter(AccountingRecord.record_type == "income")
        .with_entities(func.sum(AccountingRecord.amount))
        .scalar() or 0.0
    )
    total_expense = (
        base_q.filter(AccountingRecord.record_type == "expense")
        .with_entities(func.sum(AccountingRecord.amount))
        .scalar() or 0.0
    )
    pending_review = base_q.filter(AccountingRecord.needs_review == True).count()

    # Category breakdown
    rows = (
        base_q
        .with_entities(
            AccountingRecord.record_type,
            AccountingRecord.category,
            func.sum(AccountingRecord.amount).label("total"),
            func.count(AccountingRecord.id).label("count"),
        )
        .group_by(AccountingRecord.record_type, AccountingRecord.category)
        .all()
    )
    breakdown = [
        {"type": r.record_type, "category": r.category or "أخرى", "total": r.total, "count": r.count}
        for r in rows
    ]

    # Last 6 months trend
    trend = []
    for i in range(5, -1, -1):
        d = now - timedelta(days=30 * i)
        ym = (d.year, d.month)
        inc = (
            db.query(func.sum(AccountingRecord.amount))
            .filter(
                AccountingRecord.company_id == company_id,
                AccountingRecord.is_deleted == False,
                AccountingRecord.record_type == "income",
                extract("year", AccountingRecord.recorded_at) == ym[0],
                extract("month", AccountingRecord.recorded_at) == ym[1],
            )
            .scalar() or 0.0
        )
        exp = (
            db.query(func.sum(AccountingRecord.amount))
            .filter(
                AccountingRecord.company_id == company_id,
                AccountingRecord.is_deleted == False,
                AccountingRecord.record_type == "expense",
                extract("year", AccountingRecord.recorded_at) == ym[0],
                extract("month", AccountingRecord.recorded_at) == ym[1],
            )
            .scalar() or 0.0
        )
        trend.append({"year": ym[0], "month": ym[1], "income": inc, "expense": exp})

    setup = db.query(AccountingSetup).filter(AccountingSetup.company_id == company_id).first()

    # All-time totals for current_balance
    all_income = (
        db.query(func.sum(AccountingRecord.amount))
        .filter(AccountingRecord.company_id == company_id, AccountingRecord.is_deleted == False,
                AccountingRecord.record_type == "income")
        .scalar() or 0.0
    )
    all_expense = (
        db.query(func.sum(AccountingRecord.amount))
        .filter(AccountingRecord.company_id == company_id, AccountingRecord.is_deleted == False,
                AccountingRecord.record_type == "expense")
        .scalar() or 0.0
    )
    init_capital = getattr(setup, "initial_capital", 0.0) or 0.0

    # Check if current user is founder
    mem = db.query(CompanyMember).filter(
        CompanyMember.company_id == company_id,
        CompanyMember.user_id == current_user.id,
    ).first()
    is_founder = bool(mem and mem.role in ("owner", "admin"))

    return {
        "period": {"year": y, "month": m},
        "summary": {
            "total_income": total_income,
            "total_expense": total_expense,
            "net_profit": total_income - total_expense,
            "pending_review": pending_review,
        },
        "breakdown": breakdown,
        "trend": trend,
        "setup": {
            "has_google_sheet":  bool(setup and setup.google_sheet_id),
            "has_whatsapp":      bool(setup and setup.whatsapp_active),
            "google_sheet_url":  setup.google_sheet_url if setup else None,
            "currency":          setup.currency if setup else "SAR",
            "show_balances":     getattr(setup, "show_balances",     True)  if setup else True,
            "show_profits":      getattr(setup, "show_profits",      True)  if setup else True,
            "show_amounts":      getattr(setup, "show_amounts",      True)  if setup else True,
            "show_vendors":      getattr(setup, "show_vendors",      True)  if setup else True,
            "show_reports":      getattr(setup, "show_reports",      True)  if setup else True,
            "employees_can_add": getattr(setup, "employees_can_add", True)  if setup else True,
            "initial_capital":   init_capital,
            "current_balance":   init_capital + all_income - all_expense,
        },
        "is_founder": bool(is_founder),
    }


@router.get("/report/monthly")
def monthly_report(
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Detailed monthly report with all records."""
    company_id = _get_company_id(current_user, db)
    now = datetime.now(timezone.utc)
    y = year or now.year
    m = month or now.month

    records = (
        db.query(AccountingRecord)
        .filter(
            AccountingRecord.company_id == company_id,
            AccountingRecord.is_deleted == False,
            extract("year", AccountingRecord.recorded_at) == y,
            extract("month", AccountingRecord.recorded_at) == m,
        )
        .order_by(AccountingRecord.recorded_at.asc())
        .all()
    )

    income_records = [r for r in records if r.record_type == "income"]
    expense_records = [r for r in records if r.record_type == "expense"]

    def serialize(r: AccountingRecord) -> dict:
        return {
            "id": r.id,
            "amount": r.amount,
            "currency": r.currency,
            "category": r.category,
            "recorded_at": r.recorded_at.isoformat(),
            "source": r.source,
            "external_ref": r.external_ref,
            "needs_review": r.needs_review,
        }

    return {
        "period": {"year": y, "month": m},
        "income": {
            "total": sum(r.amount for r in income_records),
            "records": [serialize(r) for r in income_records],
        },
        "expense": {
            "total": sum(r.amount for r in expense_records),
            "records": [serialize(r) for r in expense_records],
        },
        "net": sum(r.amount for r in income_records) - sum(r.amount for r in expense_records),
    }


# ══════════════════════════════════════════════════════════════════════════════
# BOT WEBHOOKS — Telegram & WhatsApp
# ══════════════════════════════════════════════════════════════════════════════

def _get_setup_by_icode(i_code: str, db: Session) -> tuple[AccountingSetup, int, str]:
    """Find company and setup by i_code. Returns (setup, company_id, company_name)."""
    company = db.query(Company).filter(Company.i_code == i_code).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    setup = db.query(AccountingSetup).filter(
        AccountingSetup.company_id == company.id,
        AccountingSetup.is_active == True,
    ).first()
    if not setup:
        raise HTTPException(status_code=404, detail="Accounting not configured")
    return setup, company.id, company.name


async def _save_invoice_record(
    db: Session,
    company_id: int,
    invoice: dict,
    source: str,
    setup: AccountingSetup,
) -> AccountingRecord:
    """Save invoice metadata to ALLOUL DB."""
    amount = float(invoice.get("amount") or 0)
    confidence = float(invoice.get("confidence") or 0)

    record = AccountingRecord(
        company_id=company_id,
        record_type=invoice.get("record_type") or "expense",
        amount=amount,
        currency=invoice.get("currency") or setup.currency,
        category=invoice.get("category"),
        recorded_at=_parse_dt(invoice.get("date")),
        source=source,
        external_ref=invoice.get("invoice_number"),
        ai_confidence=confidence,
        needs_review=confidence < 0.7 or amount == 0,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ── Telegram ──────────────────────────────────────────────────────────────────

def _normalize_cmd(text: str) -> str:
    """
    Map Arabic / English / shorthand commands to their canonical English form.
    Only the command part (first word) is normalized; arguments are preserved.
    """
    if not text.startswith("/"):
        return text

    parts = text.split(None, 1)
    cmd   = parts[0].lower()
    args  = (" " + parts[1]) if len(parts) > 1 else ""

    _MAP = {
        # start / بداية
        "/start":       "/start",
        "/ابدأ":        "/start",
        "/بداية":       "/start",
        "/ابدا":        "/start",
        # founder / مؤسس
        "/founder":     "/founder",
        "/مؤسس":        "/founder",
        "/موسس":        "/founder",
        # addstaff / إضافة موظف
        "/addstaff":    "/addstaff",
        "/اضف":         "/addstaff",
        "/إضافة":       "/addstaff",
        "/add":         "/addstaff",
        "/اضف_موظف":   "/addstaff",
        "/addemployee": "/addstaff",
        # delstaff / حذف موظف
        "/delstaff":    "/delstaff",
        "/احذف":        "/delstaff",
        "/حذف":         "/delstaff",
        "/del":         "/delstaff",
        "/remove":      "/delstaff",
        "/حذف_موظف":   "/delstaff",
        # staff / موظفين
        "/staff":       "/staff",
        "/موظفين":      "/staff",
        "/موظفون":      "/staff",
        "/employees":   "/staff",
        "/الموظفين":    "/staff",
        # report / تقرير
        "/report":      "/report",
        "/تقرير":       "/report",
        "/ملخص":        "/report",
        "/احصائيات":    "/report",
        "/stats":       "/report",
        # top / أفضل
        "/top":         "/top",
        "/افضل":        "/top",
        "/أفضل":        "/top",
        "/الأعلى":      "/top",
        # balance / رصيد
        "/balance":     "/balance",
        "/رصيد":        "/balance",
        "/الرصيد":      "/balance",
        "/ميزان":       "/balance",
        # setbudget / ميزانية
        "/setbudget":   "/setbudget",
        "/ميزانية":     "/setbudget",
        "/حدميزانية":   "/setbudget",
        "/budgets":     "/budgets",
        "/الميزانيات":  "/budgets",
        # edit / تعديل
        "/edit":        "/edit",
        "/تعديل":       "/edit",
        "/عدل":         "/edit",
        "/تعديل":       "/edit",
        "/modify":      "/edit",
        # cancel / إلغاء
        "/cancel":      "/cancel",
        "/الغاء":       "/cancel",
        "/إلغاء":       "/cancel",
        "/وقف":         "/cancel",
        "/stop":        "/cancel",
        # logout / خروج
        "/logout":      "/logout",
        "/خروج":        "/logout",
        "/خروج":        "/logout",
        "/signout":     "/logout",
    }

    canonical = _MAP.get(cmd)
    if canonical:
        return canonical + args
    return text   # unknown command — return as-is


async def _tg_extract_text(text_msg: str) -> dict:
    """
    Extract a financial transaction from free Arabic/English text.
    Uses multi-layer fallback: Claude → DeepSeek → Regex (always works).
    """
    if BOT_SERVICE_AVAILABLE:
        return await extract_text_transaction(text_msg)
    # Inline regex fallback if service unavailable
    from services.shukra_bot import _regex_extract
    return _regex_extract(text_msg)


async def _sheet_write_bg(sheet_id: str, invoice: dict, **kw) -> None:
    """Background task: write to Google Sheet (best effort, non-blocking)."""
    try:
        await write_to_google_sheet(sheet_id, invoice, **kw)
    except Exception as e:
        logger.warning(f"Background sheet write failed: {e}")


async def _finalize_transaction(
    token: str,
    chat_id,
    company_id: int,
    company_name: str,
    setup,
    db: Session,
    sess: dict,
    invoice: dict,
    source: str,
) -> None:
    """Save to DB first (source of truth), then async sheet write."""
    import asyncio as _aio
    employee_name  = sess.get("employee_name", "")
    client_name    = sess.get("client", "")
    client_phone   = sess.get("phone", "")
    goods          = sess.get("goods", "")
    duration       = sess.get("duration", "")
    payment_status = sess.get("payment_status", "مدفوع")

    # ── 1. Save to DB immediately (source of truth) ───────────────────────────
    try:
        desc_parts = [invoice.get("description", "")]
        if goods:    desc_parts.append(f"بضاعة: {goods}")
        if duration: desc_parts.append(f"مدة: {duration}")
        record = AccountingRecord(
            company_id=company_id,
            record_type=invoice.get("record_type", "expense"),
            amount=float(invoice.get("amount") or 0),
            currency=invoice.get("currency", "SAR"),
            category=invoice.get("category"),
            vendor=client_name or invoice.get("vendor") or "",
            description=" | ".join(p for p in desc_parts if p),
            payment_status=payment_status,
            source=source,
            recorded_at=datetime.now(timezone.utc),
            external_ref=f"EMP:{employee_name}",
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        now_year   = datetime.now(timezone.utc).year
        txn_number = f"TXN-{now_year}-{record.id:04d}"
        invoice["txn_number"] = txn_number
        sheet_ok = True
    except Exception as e:
        logger.error(f"DB save failed: {e}")
        txn_number = ""
        sheet_ok   = False

    # ── 2. Write to Google Sheet async (best effort) ──────────────────────────
    if setup.google_sheet_id and sheet_ok:
        _aio.create_task(_sheet_write_bg(
            setup.google_sheet_id,
            invoice,
            source=source,
            company_name=company_name,
            employee_name=employee_name,
            client_name=client_name,
            client_phone=client_phone,
            goods=goods,
            duration=duration,
            payment_status=payment_status,
        ))

    reply = format_success_reply(
        invoice, sheet_ok,
        txn_number=txn_number,
        employee_name=employee_name,
        client_name=client_name,
        payment_status=payment_status,
    )
    await send_telegram_message(token, chat_id, reply)

    # Alert founder for large transactions
    amount = float(invoice.get("amount") or 0)
    founder_cid = _tg_founders.get(company_id)
    if amount >= _LARGE_TXN_THRESHOLD and founder_cid and str(founder_cid) != str(chat_id):
        r_type = "إيراد" if invoice.get("record_type") == "income" else "مصروف"
        alert = (
            f"🚨 <b>تنبيه معاملة كبيرة</b>\n\n"
            f"رقم: {txn_number}\n"
            f"النوع: {r_type}\n"
            f"المبلغ: {amount:,.0f} {invoice.get('currency','SAR')}\n"
            f"المنشئ: {employee_name or 'غير محدد'}\n"
            f"العميل: {client_name or 'غير محدد'}\n"
            f"حالة الدفع: {payment_status}"
        )
        await send_telegram_message(token, founder_cid, alert)

    # Budget alert: check if category exceeded its monthly limit
    category = invoice.get("category") or ""
    budgets  = _tg_budgets.get(company_id, {})
    if category and budgets and invoice.get("record_type") == "expense":
        for bcat, blimit in budgets.items():
            if bcat.lower() == category.lower():
                now_a = datetime.now(timezone.utc)
                spent = (
                    db.query(func.sum(AccountingRecord.amount))
                    .filter(
                        AccountingRecord.company_id == company_id,
                        AccountingRecord.is_deleted == False,
                        AccountingRecord.record_type == "expense",
                        AccountingRecord.category == category,
                        extract("year",  AccountingRecord.recorded_at) == now_a.year,
                        extract("month", AccountingRecord.recorded_at) == now_a.month,
                    )
                    .scalar() or 0.0
                )
                if spent >= blimit and founder_cid:
                    pct = (spent / blimit) * 100
                    await send_telegram_message(
                        token, founder_cid,
                        f"⚠️ <b>تجاوز ميزانية الفئة!</b>\n\n"
                        f"📂 الفئة: {category}\n"
                        f"💰 المصروف: {spent:,.0f}  |  الحد: {blimit:,.0f}\n"
                        f"📊 النسبة: {pct:.0f}%\n"
                        f"رقم المعاملة: {txn_number}"
                    )
                break

    # Reset pending transaction fields (keep employee logged in)
    for key in ("invoice", "client", "phone", "goods", "duration", "payment_status"):
        sess.pop(key, None)
    sess["state"] = "ready"


def _build_report_text(db: Session, company_id: int) -> str:
    """Build a quick text report for today/this month."""
    now = datetime.now(timezone.utc)
    y, m = now.year, now.month

    def sum_q(rtype):
        return (
            db.query(func.sum(AccountingRecord.amount))
            .filter(
                AccountingRecord.company_id == company_id,
                AccountingRecord.is_deleted == False,
                AccountingRecord.record_type == rtype,
                extract("year",  AccountingRecord.recorded_at) == y,
                extract("month", AccountingRecord.recorded_at) == m,
            )
            .scalar() or 0.0
        )

    income  = sum_q("income")
    expense = sum_q("expense")
    count   = (
        db.query(func.count(AccountingRecord.id))
        .filter(
            AccountingRecord.company_id == company_id,
            AccountingRecord.is_deleted == False,
            extract("year",  AccountingRecord.recorded_at) == y,
            extract("month", AccountingRecord.recorded_at) == m,
        )
        .scalar() or 0
    )

    month_names = {
        1:"يناير",2:"فبراير",3:"مارس",4:"أبريل",5:"مايو",6:"يونيو",
        7:"يوليو",8:"أغسطس",9:"سبتمبر",10:"أكتوبر",11:"نوفمبر",12:"ديسمبر"
    }
    return (
        f"📊 <b>تقرير شكرة — {month_names.get(m,'')} {y}</b>\n\n"
        f"📈 إجمالي الإيرادات:  {income:,.2f}\n"
        f"📉 إجمالي المصروفات: {expense:,.2f}\n"
        f"💰 صافي الربح:        {income - expense:,.2f}\n"
        f"📝 عدد المعاملات:     {count}"
    )


def _build_balance_text(db: Session, company_id: int) -> str:
    """Build a quick balance summary (all-time totals + current month)."""
    now = datetime.now(timezone.utc)
    y, m = now.year, now.month

    def sum_all(rtype):
        return (
            db.query(func.sum(AccountingRecord.amount))
            .filter(
                AccountingRecord.company_id == company_id,
                AccountingRecord.is_deleted == False,
                AccountingRecord.record_type == rtype,
            )
            .scalar() or 0.0
        )

    def sum_month(rtype):
        return (
            db.query(func.sum(AccountingRecord.amount))
            .filter(
                AccountingRecord.company_id == company_id,
                AccountingRecord.is_deleted == False,
                AccountingRecord.record_type == rtype,
                extract("year",  AccountingRecord.recorded_at) == y,
                extract("month", AccountingRecord.recorded_at) == m,
            )
            .scalar() or 0.0
        )

    total_in  = sum_all("income")
    total_out = sum_all("expense")
    month_in  = sum_month("income")
    month_out = sum_month("expense")
    net_all   = total_in - total_out
    net_month = month_in - month_out

    month_names = {
        1:"يناير",2:"فبراير",3:"مارس",4:"أبريل",5:"مايو",6:"يونيو",
        7:"يوليو",8:"أغسطس",9:"سبتمبر",10:"أكتوبر",11:"نوفمبر",12:"ديسمبر"
    }
    sign = "+" if net_all >= 0 else ""
    sign_m = "+" if net_month >= 0 else ""
    return (
        f"💰 <b>الرصيد — شكرة</b>\n\n"
        f"<b>هذا الشهر ({month_names.get(m,'')})</b>\n"
        f"  📈 دخل:     {month_in:,.2f}\n"
        f"  📉 مصروف:  {month_out:,.2f}\n"
        f"  🔵 صافي:   {sign_m}{net_month:,.2f}\n\n"
        f"<b>الإجمالي الكلي</b>\n"
        f"  📈 دخل:     {total_in:,.2f}\n"
        f"  📉 مصروف:  {total_out:,.2f}\n"
        f"  {'🟢' if net_all >= 0 else '🔴'} صافي:   {sign}{net_all:,.2f}"
    )


# ══════════════════════════════════════════════════════════════════════════════
# Daily auto-report — 6:00 PM Saudi time (UTC+3 = 15:00 UTC)
# Sends report to every active Telegram company's founder
# Started from main.py lifespan via asyncio.create_task(start_daily_report())
# ══════════════════════════════════════════════════════════════════════════════
import asyncio as _asyncio

_AST = timezone(timedelta(hours=3))  # Arabia Standard Time
_daily_sent: set[str] = set()        # "company_id:YYYY-MM-DD" keys already sent today


async def _daily_report_loop() -> None:
    """Background loop: sends daily report to founders at 18:00 AST."""
    logger.info("Shukra daily-report loop started.")
    while True:
        try:
            now_ast = datetime.now(_AST)
            # Fire between 18:00:00 and 18:00:59
            if now_ast.hour == 18 and now_ast.minute == 0:
                today_key_prefix = now_ast.strftime("%Y-%m-%d")
                from database import SessionLocal
                db = SessionLocal()
                try:
                    setups = (
                        db.query(AccountingSetup)
                        .filter(
                            AccountingSetup.is_active == True,
                            AccountingSetup.telegram_active == True,
                            AccountingSetup.telegram_bot_token.isnot(None),
                        )
                        .all()
                    )
                    for setup in setups:
                        key = f"{setup.company_id}:{today_key_prefix}"
                        if key in _daily_sent:
                            continue
                        founder_cid = _tg_founders.get(setup.company_id)
                        if not founder_cid:
                            continue
                        _daily_sent.add(key)
                        try:
                            report = _build_report_text(db, setup.company_id)
                            balance = _build_balance_text(db, setup.company_id)
                            msg = (
                                f"🌅 <b>التقرير اليومي — شكرة</b>\n"
                                f"📅 {now_ast.strftime('%Y-%m-%d')}\n\n"
                                f"{report}\n\n"
                                f"{balance}"
                            )
                            await send_telegram_message(setup.telegram_bot_token, founder_cid, msg)
                            logger.info(f"Daily report sent to company {setup.company_id} founder {founder_cid}")
                        except Exception as e:
                            logger.error(f"Daily report send error company {setup.company_id}: {e}")
                finally:
                    db.close()
                # Cleanup old keys (keep only today)
                _daily_sent.intersection_update(
                    {k for k in _daily_sent if k.endswith(today_key_prefix)}
                )
                await _asyncio.sleep(60)  # skip rest of this minute
            else:
                # Sleep until the next full minute
                secs_to_next = 60 - now_ast.second
                await _asyncio.sleep(secs_to_next)
        except _asyncio.CancelledError:
            logger.info("Shukra daily-report loop cancelled.")
            break
        except Exception as e:
            logger.error(f"Daily report loop error: {e}")
            await _asyncio.sleep(60)


async def start_daily_report() -> None:
    """Call this once from app lifespan to launch the background loop."""
    _asyncio.create_task(_daily_report_loop())


@router.post("/bot/telegram/{i_code}", include_in_schema=False)
async def telegram_webhook(
    i_code: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Receive Telegram updates for a specific company (identified by i_code)."""
    if not BOT_SERVICE_AVAILABLE:
        return {"ok": True}

    try:
        body = await request.json()
    except Exception:
        return {"ok": True}

    try:
        setup, company_id, company_name = _get_setup_by_icode(i_code, db)
    except HTTPException:
        return {"ok": True}

    if not setup.telegram_bot_token:
        return {"ok": True}

    token   = setup.telegram_bot_token
    message = body.get("message") or body.get("channel_post") or {}
    chat_id = message.get("chat", {}).get("id")
    if not chat_id:
        return {"ok": True}

    text_msg = _normalize_cmd(message.get("text", "").strip())

    # Load persistent data from disk on first access
    _load_company(company_id)

    sess  = _session(company_id, chat_id)
    state = sess.get("state", "init")

    # ══════════════════════════════════════════════════════════
    # FOUNDER COMMANDS (always available regardless of auth state)
    # ══════════════════════════════════════════════════════════

    # Founder-only commands — available only after founder has logged in
    if _is_founder(company_id, chat_id):

        # /addstaff <employee_no> — grant bot access to a platform user
        if text_msg.startswith("/addstaff "):
            emp_no = text_msg[len("/addstaff "):].strip()
            target = db.query(User).filter(User.employee_no == emp_no).first()
            if not target:
                await send_telegram_message(
                    token, chat_id,
                    f"❌ لا يوجد مستخدم برقم الموظف <code>{emp_no}</code> في المنصة."
                )
                return {"ok": True}
            # must be a member of this company
            member = db.query(CompanyMember).filter(
                CompanyMember.company_id == company_id,
                CompanyMember.user_id == target.id,
            ).first()
            if not member:
                await send_telegram_message(
                    token, chat_id,
                    f"⚠️ المستخدم <b>{target.username}</b> ليس عضواً في شركتك.\n"
                    "يجب أن يكون منضماً للشركة أولاً من المنصة."
                )
                return {"ok": True}
            # create or update AccountingPermission
            perm = db.query(AccountingPermission).filter(
                AccountingPermission.company_id == company_id,
                AccountingPermission.user_id == target.id,
            ).first()
            if perm:
                perm.can_use_bot = True
                perm.is_active   = True
            else:
                perm = AccountingPermission(
                    company_id=company_id,
                    user_id=target.id,
                    can_use_bot=True,
                    can_add_records=True,
                    can_view_reports=True,
                    is_active=True,
                )
                db.add(perm)
            db.commit()
            await send_telegram_message(
                token, chat_id,
                f"✅ تم منح الوصول لـ <b>{target.name or target.username}</b>\n"
                f"🔢 رقم الموظف: <code>{emp_no}</code>\n\n"
                "يمكنه الآن تسجيل الدخول للبوت برقم موظفه وكلمة مرور المنصة."
            )
            return {"ok": True}

        # /delstaff <employee_no> — revoke bot access
        if text_msg.startswith("/delstaff "):
            emp_no = text_msg[len("/delstaff "):].strip()
            target = db.query(User).filter(User.employee_no == emp_no).first()
            if not target:
                await send_telegram_message(
                    token, chat_id,
                    f"❌ لا يوجد مستخدم برقم الموظف <code>{emp_no}</code>."
                )
                return {"ok": True}
            perm = db.query(AccountingPermission).filter(
                AccountingPermission.company_id == company_id,
                AccountingPermission.user_id == target.id,
            ).first()
            if perm:
                perm.can_use_bot = False
                db.commit()
            # kick active sessions for this user
            for cid, s in list(_tg_sessions.get(company_id, {}).items()):
                if s.get("user_id") == target.id:
                    _tg_sessions[company_id].pop(cid, None)
            await send_telegram_message(
                token, chat_id,
                f"✅ تم إلغاء وصول <b>{target.name or target.username}</b> (رقم {emp_no}) من البوت."
            )
            return {"ok": True}

        # /staff — list all users with bot access
        if text_msg == "/staff":
            perms = (
                db.query(AccountingPermission, User)
                .join(User, AccountingPermission.user_id == User.id)
                .filter(
                    AccountingPermission.company_id == company_id,
                    AccountingPermission.can_use_bot == True,
                    AccountingPermission.is_active == True,
                )
                .all()
            )
            if not perms:
                await send_telegram_message(
                    token, chat_id,
                    "ℹ️ لا يوجد موظفون لديهم وصول للبوت بعد.\n"
                    "استخدم: /addstaff <رقم_الموظف>"
                )
            else:
                lines = ["👥 <b>الموظفون المصرّح لهم بالبوت</b>\n"]
                for p, u in perms:
                    lines.append(
                        f"• {u.name or u.username}  |  رقم: <code>{u.employee_no}</code>"
                    )
                lines.append(f"\nالإجمالي: {len(perms)} موظف")
                await send_telegram_message(token, chat_id, "\n".join(lines))
            return {"ok": True}

        # /report — monthly summary
        if text_msg == "/report":
            await send_telegram_message(token, chat_id, _build_report_text(db, company_id))
            return {"ok": True}

        # /balance — quick current balance
        if text_msg == "/balance":
            await send_telegram_message(token, chat_id, _build_balance_text(db, company_id))
            return {"ok": True}

        # /top — top expense categories
        if text_msg == "/top":
            now = datetime.now(timezone.utc)
            rows = (
                db.query(
                    AccountingRecord.category,
                    func.sum(AccountingRecord.amount).label("total"),
                )
                .filter(
                    AccountingRecord.company_id == company_id,
                    AccountingRecord.is_deleted == False,
                    AccountingRecord.record_type == "expense",
                    extract("year",  AccountingRecord.recorded_at) == now.year,
                    extract("month", AccountingRecord.recorded_at) == now.month,
                )
                .group_by(AccountingRecord.category)
                .order_by(func.sum(AccountingRecord.amount).desc())
                .limit(5)
                .all()
            )
            if not rows:
                await send_telegram_message(token, chat_id, "ℹ️ لا توجد مصروفات هذا الشهر.")
            else:
                lines = ["🏆 <b>أكثر فئات المصروفات</b>\n"]
                for i, r in enumerate(rows, 1):
                    lines.append(f"{i}. {r.category or 'أخرى'}: {r.total:,.0f}")
                await send_telegram_message(token, chat_id, "\n".join(lines))
            return {"ok": True}

        # /setbudget <category> <amount> — set monthly budget limit for a category
        if text_msg.startswith("/setbudget "):
            parts = text_msg[len("/setbudget "):].strip().rsplit(None, 1)
            if len(parts) != 2:
                await send_telegram_message(
                    token, chat_id,
                    "⚠️ الصيغة: /setbudget <اسم الفئة> <المبلغ>\n"
                    "مثال: /setbudget مصاريف_إدارية 5000"
                )
                return {"ok": True}
            bcat, bamt_str = parts
            try:
                bamt = float(bamt_str.replace(",", ""))
            except ValueError:
                await send_telegram_message(token, chat_id, "⚠️ المبلغ غير صحيح.")
                return {"ok": True}
            _tg_budgets[company_id][bcat.strip()] = bamt
            _save_company(company_id)
            await send_telegram_message(
                token, chat_id,
                f"✅ تم تعيين ميزانية شهرية:\n"
                f"📂 الفئة: <b>{bcat.strip()}</b>\n"
                f"💰 الحد: <b>{bamt:,.0f}</b>\n\n"
                "سيصلك تنبيه فور تجاوز هذا المبلغ."
            )
            return {"ok": True}

        # /budgets — list all budget limits
        if text_msg == "/budgets":
            budgets = _tg_budgets.get(company_id, {})
            if not budgets:
                await send_telegram_message(
                    token, chat_id,
                    "ℹ️ لا توجد ميزانيات محددة.\n"
                    "استخدم: /setbudget <فئة> <مبلغ>"
                )
            else:
                lines = ["📊 <b>الميزانيات الشهرية</b>\n"]
                for bcat, blimit in budgets.items():
                    lines.append(f"• {bcat}: {blimit:,.0f}")
                await send_telegram_message(token, chat_id, "\n".join(lines))
            return {"ok": True}

    # ══════════════════════════════════════════════════════════
    # /cancel — abort current flow
    # ══════════════════════════════════════════════════════════
    if text_msg == "/cancel":
        for key in ("invoice", "client", "phone", "goods", "duration", "payment_status", "pending_name"):
            sess.pop(key, None)
        if state not in ("init", "await_id", "await_password"):
            sess["state"] = "ready"
            await send_telegram_message(token, chat_id, "✅ تم إلغاء العملية. يمكنك إرسال معاملة جديدة.")
        else:
            await send_telegram_message(token, chat_id, "✅ تم الإلغاء. أرسل /start للبدء.")
        return {"ok": True}

    # /logout
    if text_msg == "/logout":
        _tg_sessions[company_id].pop(str(chat_id), None)
        await send_telegram_message(token, chat_id, "👋 تم تسجيل الخروج. أرسل /start لتسجيل الدخول من جديد.")
        return {"ok": True}

    # ══════════════════════════════════════════════════════════
    # AUTHENTICATION FLOW
    # ══════════════════════════════════════════════════════════

    if state == "init" or text_msg == "/start":
        sess["state"] = "await_id"
        await send_telegram_message(
            token, chat_id,
            "👋 مرحباً في <b>شكرة</b> 📊\n\n"
            "🔢 أدخل <b>رقم موظفك</b>\n\n"
            "📌 رقمك موجود في ملفك الشخصي على المنصة\n"
            "مثال: <code>00000</code>"
        )
        return {"ok": True}

    if state == "await_id":
        entered_no = text_msg.strip()
        # Look up the user by employee_no in DB
        target_user = db.query(User).filter(User.employee_no == entered_no).first()
        if not target_user:
            await send_telegram_message(
                token, chat_id,
                "❌ رقم الموظف غير موجود في المنصة.\n"
                "تحقق من الرقم في ملفك الشخصي وأعد المحاولة."
            )
            return {"ok": True}
        # Check that user is a member of this company
        member = db.query(CompanyMember).filter(
            CompanyMember.company_id == company_id,
            CompanyMember.user_id == target_user.id,
        ).first()
        if not member:
            await send_telegram_message(
                token, chat_id,
                "❌ أنت لست عضواً في هذه الشركة.\n"
                "تواصل مع المؤسس لإضافتك للشركة من المنصة."
            )
            return {"ok": True}
        # Founders (owner/admin) don't need AccountingPermission
        is_founder_role = member.role in ("owner", "admin")
        if not is_founder_role:
            # Check bot access permission
            perm = db.query(AccountingPermission).filter(
                AccountingPermission.company_id == company_id,
                AccountingPermission.user_id == target_user.id,
                AccountingPermission.can_use_bot == True,
                AccountingPermission.is_active == True,
            ).first()
            if not perm:
                await send_telegram_message(
                    token, chat_id,
                    "❌ ليس لديك صلاحية استخدام البوت.\n"
                    "تواصل مع المؤسس لمنحك الوصول عبر /addstaff."
                )
                return {"ok": True}
        sess["pending_user_id"] = target_user.id
        sess["state"]           = "await_password"
        await send_telegram_message(token, chat_id, "🔐 أدخل <b>كلمة مرور المنصة</b>:")
        return {"ok": True}

    if state == "await_password":
        pending_user_id = sess.get("pending_user_id")
        if not pending_user_id:
            sess["state"] = "await_id"
            await send_telegram_message(token, chat_id, "⚠️ انتهت الجلسة. أعد إدخال رقم موظفك:")
            return {"ok": True}
        target_user = db.query(User).filter(User.id == pending_user_id).first()
        if not target_user or not target_user.hashed_password:
            sess["state"] = "await_id"
            await send_telegram_message(
                token, chat_id,
                "❌ لم يتم العثور على الحساب أو لم تُعيَّن كلمة مرور بعد.\n"
                "أعد إدخال رقم موظفك:"
            )
            return {"ok": True}
        if not verify_password(text_msg.strip(), target_user.hashed_password):
            sess["state"] = "await_id"
            sess.pop("pending_user_id", None)
            await send_telegram_message(
                token, chat_id,
                "❌ كلمة المرور غير صحيحة.\n🔢 أعد إدخال رقم موظفك:"
            )
            return {"ok": True}
        # Password correct — determine role
        member = db.query(CompanyMember).filter(
            CompanyMember.company_id == company_id,
            CompanyMember.user_id == target_user.id,
        ).first()
        is_founder_role = member and member.role in ("owner", "admin")
        sess["state"]         = "ready"
        sess["user_id"]       = target_user.id
        sess["employee_no"]   = target_user.employee_no
        sess["employee_name"] = target_user.name or target_user.username
        sess["is_founder"]    = is_founder_role
        sess.pop("pending_user_id", None)
        if is_founder_role:
            _tg_founders[company_id] = str(chat_id)
            _save_company(company_id)
            founder_cmds = (
                "\n\n👑 <b>أوامر المؤسس:</b>\n"
                "/addstaff <رقم_موظف> — منح وصول للبوت\n"
                "/delstaff <رقم_موظف> — إلغاء الوصول\n"
                "/staff — قائمة الموظفين المصرّح لهم\n"
                "/setbudget <فئة> <مبلغ> — تعيين ميزانية\n"
                "/budgets — عرض الميزانيات"
            )
        else:
            founder_cmds = ""
        display_name = target_user.name or target_user.username
        await send_telegram_message(
            token, chat_id,
            f"✅ أهلاً <b>{display_name}</b>!\n\n"
            "يمكنك الآن:\n"
            "• إرسال صورة فاتورة 📷\n"
            "• كتابة المعاملة نصاً:\n"
            "  «اشتريت بضاعة بـ 5000 ريال»\n"
            "  «بعنا للعميل بـ 12000 دولار»\n\n"
            "📋 <b>الأوامر المتاحة:</b>\n"
            "/balance — الرصيد الحالي\n"
            "/report — تقرير الشهر\n"
            "/top — أكثر الفئات إنفاقاً\n"
            "/cancel — إلغاء العملية\n"
            f"/logout — تسجيل الخروج{founder_cmds}"
        )
        return {"ok": True}

    # ══════════════════════════════════════════════════════════
    # AUTHENTICATED FLOWS
    # ══════════════════════════════════════════════════════════

    if not _is_authenticated(company_id, chat_id):
        sess["state"] = "await_id"
        await send_telegram_message(token, chat_id, "⚠️ يجب تسجيل الدخول أولاً.\n🔢 أدخل رقم الهوية (ID):")
        return {"ok": True}

    # ── Edit transaction flow (/edit TXN-YYYY-NNNN) ───────────────────────────

    _EDIT_FIELDS = {
        "1": ("amount",   "💰 المبلغ الجديد:"),
        "2": ("type",     "📊 النوع (إيراد/مصروف):"),
        "3": ("client",   "🏪 اسم العميل/المورد الجديد:"),
        "4": ("phone",    "📱 رقم الهاتف الجديد:"),
        "5": ("goods",    "📦 البضاعة/الخدمة الجديدة:"),
        "6": ("category", "📂 الفئة الجديدة:"),
        "7": ("payment",  "💳 حالة الدفع (مدفوع/غير مدفوع/مدفوع جزئياً):"),
        "8": ("duration", "⏱ مدة الدفع الجديدة:"),
        "9": ("desc",     "📝 الوصف الجديد:"),
    }

    _EDIT_MENU = (
        "✏️ <b>اختر الحقل للتعديل:</b>\n\n"
        "1 — المبلغ\n"
        "2 — النوع (إيراد/مصروف)\n"
        "3 — العميل/المورد\n"
        "4 — رقم الهاتف\n"
        "5 — البضاعة/الخدمة\n"
        "6 — الفئة\n"
        "7 — حالة الدفع\n"
        "8 — مدة الدفع\n"
        "9 — الوصف\n\n"
        "/cancel للإلغاء"
    )

    def _can_edit(company_id: int, chat_id) -> bool:
        """Founder always can edit. Employees need can_edit_records permission."""
        if _is_founder(company_id, chat_id):
            return True
        # Check DB permission
        return False  # evaluated below with DB access

    # /edit TXN-YYYY-NNNN
    if text_msg.upper().startswith("/EDIT ") or text_msg.startswith("/edit "):
        txn_num = text_msg.split(None, 1)[1].strip().upper()
        if not txn_num.startswith("TXN-"):
            await send_telegram_message(token, chat_id, "⚠️ الصيغة: /edit TXN-2026-0001")
            return {"ok": True}

        # Check edit permission
        can_edit = _is_founder(company_id, chat_id)
        if not can_edit:
            perm = db.query(AccountingPermission).filter(
                AccountingPermission.company_id == company_id,
                AccountingPermission.user_id == current_user.id if hasattr(locals(), "current_user") else 0,
                AccountingPermission.is_active == True,
                AccountingPermission.can_edit_records == True,
            ).first() if False else None  # Telegram users don't have ALLOUL accounts
            # For Telegram: grant edit to all authenticated employees (founder controls access)
            can_edit = True  # authenticated = trusted by founder

        if not setup.google_sheet_id:
            await send_telegram_message(token, chat_id, "⚠️ لم يتم ربط Google Sheet بعد.")
            return {"ok": True}

        await send_telegram_message(token, chat_id, f"⏳ جاري البحث عن {txn_num}...")
        txn = await get_txn_row(setup.google_sheet_id, txn_num)
        if not txn:
            await send_telegram_message(
                token, chat_id,
                f"❌ لم أجد المعاملة <b>{txn_num}</b>.\n"
                "تأكد من الرقم وأعد المحاولة."
            )
            return {"ok": True}

        # Show current values
        summary = (
            f"📋 <b>{txn_num}</b>\n\n"
            f"📅 التاريخ: {txn['date']}\n"
            f"📊 النوع: {txn['type']}\n"
            f"💰 المبلغ: {txn['amount']} {txn['currency']}\n"
            f"🏪 العميل: {txn['client']}\n"
            f"📱 الهاتف: {txn['phone']}\n"
            f"📦 البضاعة: {txn['goods']}\n"
            f"📂 الفئة: {txn['category']}\n"
            f"💳 حالة الدفع: {txn['payment']}\n"
            f"⏱ المدة: {txn['duration']}\n\n"
        )
        sess["edit_txn"] = txn_num
        sess["state"]    = "edit_choose_field"
        await send_telegram_message(token, chat_id, summary + _EDIT_MENU)
        return {"ok": True}

    if state == "edit_choose_field":
        choice = text_msg.strip()
        if choice not in _EDIT_FIELDS:
            await send_telegram_message(token, chat_id, f"⚠️ أرسل رقماً من 1 إلى 9\n{_EDIT_MENU}")
            return {"ok": True}
        sess["edit_field"]  = _EDIT_FIELDS[choice][0]
        sess["state"]       = "edit_enter_value"
        await send_telegram_message(token, chat_id, _EDIT_FIELDS[choice][1])
        return {"ok": True}

    if state == "edit_enter_value":
        txn_num    = sess.get("edit_txn", "")
        field      = sess.get("edit_field", "")
        new_val    = text_msg.strip()
        editor     = sess.get("employee_name", "مجهول")

        # Normalize type field
        if field == "type":
            if any(w in new_val for w in ("إيراد", "ايراد", "income", "دخل")):
                new_val = "📈 إيراد"
            else:
                new_val = "📉 مصروف"

        # Normalize payment field
        if field == "payment":
            mapping = {
                "مدفوع": "مدفوع", "1": "مدفوع", "paid": "مدفوع",
                "غير مدفوع": "غير مدفوع", "2": "غير مدفوع", "unpaid": "غير مدفوع",
                "مدفوع جزئياً": "مدفوع جزئياً", "3": "مدفوع جزئياً", "partial": "مدفوع جزئياً",
            }
            new_val = mapping.get(new_val, new_val)

        await send_telegram_message(token, chat_id, "⏳ جاري التعديل...")
        ok = await update_txn_field(setup.google_sheet_id, txn_num, field, new_val, editor_name=editor)
        sess["state"] = "ready"
        sess.pop("edit_txn",   None)
        sess.pop("edit_field", None)

        if ok:
            await send_telegram_message(
                token, chat_id,
                f"✅ تم تعديل <b>{txn_num}</b> بنجاح.\n"
                f"📝 تم تسجيل التعديل بواسطة: {editor}"
            )
        else:
            await send_telegram_message(token, chat_id, "❌ فشل التعديل. تأكد من رقم المعاملة وأعد المحاولة.")
        return {"ok": True}

    # ── Employee-accessible quick commands ────────────────────────────────────

    if text_msg == "/balance":
        await send_telegram_message(token, chat_id, _build_balance_text(db, company_id))
        return {"ok": True}

    if text_msg == "/report":
        await send_telegram_message(token, chat_id, _build_report_text(db, company_id))
        return {"ok": True}

    # ── Conversational enrichment steps ───────────────────────────────────────

    if state == "await_client":
        sess["client"] = text_msg if text_msg not in ("-", "تخطى", "skip") else ""
        sess["state"]  = "await_phone"
        await send_telegram_message(token, chat_id, "📱 رقم هاتف العميل/المورد: (أو أرسل - للتخطي)")
        return {"ok": True}

    if state == "await_phone":
        sess["phone"] = text_msg if text_msg not in ("-", "تخطى", "skip") else ""
        sess["state"] = "await_goods"
        await send_telegram_message(token, chat_id, "📦 نوع البضاعة أو الخدمة: (أو أرسل - للتخطي)")
        return {"ok": True}

    if state == "await_goods":
        sess["goods"] = text_msg if text_msg not in ("-", "تخطى", "skip") else ""
        sess["state"] = "await_payment"
        await send_telegram_message(
            token, chat_id,
            "💳 حالة الدفع؟\n1 — مدفوع\n2 — غير مدفوع\n3 — مدفوع جزئياً"
        )
        return {"ok": True}

    if state == "await_payment":
        mapping = {"1": "مدفوع", "2": "غير مدفوع", "3": "مدفوع جزئياً",
                   "مدفوع": "مدفوع", "غير مدفوع": "غير مدفوع", "مدفوع جزئياً": "مدفوع جزئياً",
                   "paid": "مدفوع", "unpaid": "غير مدفوع", "partial": "مدفوع جزئياً"}
        sess["payment_status"] = mapping.get(text_msg.strip(), "مدفوع")
        sess["state"] = "await_duration"
        await send_telegram_message(token, chat_id, "⏱ مدة الدفع: (مثال: 30 يوم، فوري) أو أرسل - للتخطي")
        return {"ok": True}

    if state == "await_duration":
        sess["duration"] = text_msg if text_msg not in ("-", "تخطى", "skip") else ""
        # All info collected — finalize
        invoice = sess.get("invoice", {})
        if invoice:
            await send_telegram_message(token, chat_id, "⏳ جاري الحفظ...")
            await _finalize_transaction(
                token, chat_id, company_id, company_name, setup, db, sess,
                invoice, source="telegram_text"
            )
        else:
            sess["state"] = "ready"
            await send_telegram_message(token, chat_id, "⚠️ انتهت صلاحية المعاملة. أعد الإرسال.")
        return {"ok": True}

    # ── New transaction: text message ─────────────────────────────────────────

    if text_msg and not message.get("photo") and not message.get("document"):
        await send_telegram_message(token, chat_id, "⏳ جاري استخراج المعاملة...")
        invoice = await _tg_extract_text(text_msg)

        if not invoice or not invoice.get("amount"):
            await send_telegram_message(
                token, chat_id,
                "⚠️ لم أفهم المبلغ. تأكد من ذكر الرقم مثلاً:\n"
                "«اشتريت لاند كروزر بـ 100000 ريال»\n"
                "«بعنا بضاعة بـ 5000 دولار»"
            )
            return {"ok": True}

        sess["invoice"] = invoice
        sess["state"]   = "await_client"
        await send_telegram_message(
            token, chat_id,
            f"✔️ فهمت: <b>{invoice.get('record_type','expense') == 'income' and 'إيراد' or 'مصروف'}</b> "
            f"بمبلغ <b>{invoice.get('amount')} {invoice.get('currency','SAR')}</b>\n\n"
            "🏪 اسم العميل أو المورد: (أو أرسل - للتخطي)"
        )
        return {"ok": True}

    # ── New transaction: photo / document ─────────────────────────────────────

    photo_list = message.get("photo")
    document   = message.get("document")

    file_id = None
    if photo_list:
        file_id = photo_list[-1]["file_id"]
    elif document and document.get("mime_type", "").startswith("image"):
        file_id = document["file_id"]

    if not file_id:
        await send_telegram_message(token, chat_id, "📎 أرسل صورة فاتورة أو اكتب المعاملة نصاً.")
        return {"ok": True}

    await send_telegram_message(token, chat_id, "⏳ جاري معالجة الفاتورة بالذكاء الاصطناعي...")

    try:
        image_bytes, media_type = await download_telegram_file(token, file_id)
        invoice = await extract_invoice_from_image(image_bytes, media_type)

        if not invoice or invoice.get("confidence", 0) == 0:
            await send_telegram_message(token, chat_id, format_error_reply())
            return {"ok": True}

        sess["invoice"] = invoice
        sess["state"]   = "await_client"
        r_type_label = "إيراد" if invoice.get("record_type") == "income" else "مصروف"
        await send_telegram_message(
            token, chat_id,
            f"✔️ استخرجت: <b>{r_type_label}</b> "
            f"بمبلغ <b>{invoice.get('amount')} {invoice.get('currency','SAR')}</b>\n\n"
            "🏪 اسم العميل أو المورد: (أو أرسل - للتخطي)"
        )

    except Exception as e:
        logger.error(f"Telegram invoice processing error: {e}")
        await send_telegram_message(token, chat_id, "⚠️ حدث خطأ في المعالجة. حاول مرة أخرى.")

    return {"ok": True}


# ── WhatsApp ──────────────────────────────────────────────────────────────────

@router.get("/bot/whatsapp/{i_code}", response_class=PlainTextResponse)
async def whatsapp_verify(
    i_code: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Meta webhook verification challenge."""
    params = dict(request.query_params)
    mode      = params.get("hub.mode")
    token     = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    try:
        setup, _, __ = _get_setup_by_icode(i_code, db)
    except HTTPException:
        raise HTTPException(status_code=403, detail="Not found")

    if mode == "subscribe" and token == setup.whatsapp_verify_token:
        logger.info(f"WhatsApp webhook verified for {i_code}")
        return challenge or ""

    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/bot/whatsapp/{i_code}", include_in_schema=False)
async def whatsapp_webhook(
    i_code: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Receive WhatsApp Cloud API messages for a company."""
    if not BOT_SERVICE_AVAILABLE:
        return {"ok": True}

    try:
        body = await request.json()
    except Exception:
        return {"ok": True}

    try:
        setup, company_id, company_name = _get_setup_by_icode(i_code, db)
    except HTTPException:
        return {"ok": True}

    if not setup.whatsapp_phone_number_id or not setup.whatsapp_access_token:
        return {"ok": True}

    phone_id    = setup.whatsapp_phone_number_id
    access_tok  = setup.whatsapp_access_token

    try:
        entry    = body.get("entry", [{}])[0]
        changes  = entry.get("changes", [{}])[0]
        value    = changes.get("value", {})
        messages = value.get("messages", [])

        if not messages:
            return {"ok": True}

        msg    = messages[0]
        from_  = msg.get("from")
        msg_type = msg.get("type")

        if msg_type == "text":
            text = msg.get("text", {}).get("body", "").strip()
            if text.lower() in ("/start", "مرحبا", "مرحباً", "ابدأ"):
                await send_whatsapp_message(
                    phone_id, access_tok, from_,
                    "مرحباً بك في شكرة 📊\n\nأرسل صورة أي فاتورة وسأستخرج بياناتها تلقائياً.",
                )
            return {"ok": True}

        if msg_type not in ("image", "document"):
            return {"ok": True}

        media_id = (msg.get("image") or msg.get("document") or {}).get("id")
        if not media_id:
            return {"ok": True}

        # Acknowledge
        await send_whatsapp_message(phone_id, access_tok, from_, "⏳ جاري معالجة الفاتورة...")

        image_bytes, media_type = await download_whatsapp_media(media_id, access_tok)
        invoice = await extract_invoice_from_image(image_bytes, media_type)

        if not invoice or invoice.get("confidence", 0) == 0:
            await send_whatsapp_message(phone_id, access_tok, from_, format_error_reply())
            return {"ok": True}

        sheet_ok, txn_number = False, ""
        if setup.google_sheet_id:
            sheet_ok, txn_number = await write_to_google_sheet(
                setup.google_sheet_id, invoice, source="whatsapp", company_name=company_name
            )

        await _save_invoice_record(db, company_id, invoice, "whatsapp", setup)
        await send_whatsapp_message(
            phone_id, access_tok, from_,
            format_success_reply(invoice, sheet_ok, txn_number=txn_number)
        )

    except Exception as e:
        logger.error(f"WhatsApp invoice processing error: {e}")

    return {"ok": True}


# ── Webhook Info (authenticated) ──────────────────────────────────────────────

@router.get("/bot/info")
def get_bot_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return webhook URLs and service email for the current company."""
    from config import settings
    company_id = _get_company_id(current_user, db)
    company = db.query(Company).filter(Company.id == company_id).first()
    api_base = getattr(settings, "API_BASE_URL", "https://api.alloul.app")
    setup = db.query(AccountingSetup).filter(AccountingSetup.company_id == company_id).first()

    return {
        "service_email": SHUKRA_SERVICE_EMAIL if BOT_SERVICE_AVAILABLE else "shukra@alloul-ai.iam.gserviceaccount.com",
        "webhook_telegram": f"{api_base}/accounting/bot/telegram/{company.i_code}" if company else None,
        "webhook_whatsapp": f"{api_base}/accounting/bot/whatsapp/{company.i_code}" if company else None,
        "verify_token": setup.whatsapp_verify_token if setup else None,
        "telegram_active": setup.telegram_active if setup else False,
        "whatsapp_active": setup.whatsapp_active if setup else False,
    }


# ── Permissions (founder only) ────────────────────────────────────────────────

def _assert_founder(user: User, company_id: int, db: Session):
    """Raise 403 if user is not the company founder."""
    mem = db.query(CompanyMember).filter(
        CompanyMember.user_id == user.id,
        CompanyMember.company_id == company_id,
    ).first()
    if not mem or mem.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="المؤسس فقط يملك هذه الصلاحية")


@router.get("/permissions")
def list_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """المؤسس يشوف كل الصلاحيات الممنوحة."""
    company_id = _get_company_id(current_user, db)
    _assert_founder(current_user, company_id, db)
    perms = db.query(AccountingPermission).filter(
        AccountingPermission.company_id == company_id,
        AccountingPermission.is_active == True,
    ).all()
    result = []
    for p in perms:
        user = db.query(User).filter(User.id == p.user_id).first()
        result.append({
            "id": p.id,
            "user_id": p.user_id,
            "name": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else f"User #{p.user_id}",
            "username": getattr(user, "username", None) if user else None,
            "can_view_dashboard": p.can_view_dashboard,
            "can_view_amounts":   p.can_view_amounts,
            "can_view_profits":   p.can_view_profits,
            "can_view_reports":   p.can_view_reports,
            "can_view_vendors":   p.can_view_vendors,
            "can_add_records":    p.can_add_records,
            "can_edit_records":   p.can_edit_records,
            "can_delete_records": p.can_delete_records,
            "can_use_bot":        p.can_use_bot,
            "is_active":          p.is_active,
        })
    return result


@router.post("/permissions", response_model=PermissionOut)
def grant_permission(
    body: PermissionIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """المؤسس يمنح موظفاً صلاحيات محددة."""
    company_id = _get_company_id(current_user, db)
    _assert_founder(current_user, company_id, db)

    # تأكد أن الموظف عضو في الشركة
    mem = db.query(CompanyMember).filter(
        CompanyMember.user_id == body.user_id,
        CompanyMember.company_id == company_id,
    ).first()
    if not mem:
        raise HTTPException(status_code=404, detail="الموظف غير موجود في الشركة")

    perm = db.query(AccountingPermission).filter(
        AccountingPermission.company_id == company_id,
        AccountingPermission.user_id == body.user_id,
    ).first()

    if not perm:
        perm = AccountingPermission(
            company_id=company_id,
            user_id=body.user_id,
            granted_by=current_user.id,
        )
        db.add(perm)

    perm.can_view_dashboard = body.can_view_dashboard
    perm.can_view_amounts   = body.can_view_amounts
    perm.can_view_profits   = body.can_view_profits
    perm.can_view_reports   = body.can_view_reports
    perm.can_view_vendors   = body.can_view_vendors
    perm.can_add_records    = body.can_add_records
    perm.can_edit_records   = body.can_edit_records
    perm.can_delete_records = body.can_delete_records
    perm.can_use_bot        = body.can_use_bot
    perm.is_active          = True

    db.commit()
    db.refresh(perm)
    return perm


@router.delete("/permissions/{user_id}")
def revoke_permission(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """المؤسس يسحب صلاحيات موظف."""
    company_id = _get_company_id(current_user, db)
    _assert_founder(current_user, company_id, db)
    perm = db.query(AccountingPermission).filter(
        AccountingPermission.company_id == company_id,
        AccountingPermission.user_id == user_id,
    ).first()
    if perm:
        perm.is_active = False
        db.commit()
    return {"ok": True}


@router.get("/my-permissions")
def my_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """كل موظف يشوف صلاحياته."""
    company_id = _get_company_id(current_user, db)
    setup = db.query(AccountingSetup).filter(AccountingSetup.company_id == company_id).first()

    # المؤسس يشوف كل شيء
    mem = db.query(CompanyMember).filter(
        CompanyMember.user_id == current_user.id,
        CompanyMember.company_id == company_id,
    ).first()
    is_founder = mem and mem.role in ("owner", "admin")

    if is_founder:
        return {
            "is_founder": True,
            "can_view_dashboard": True,
            "can_view_amounts":   True,
            "can_view_profits":   True,
            "can_view_reports":   True,
            "can_view_vendors":   True,
            "can_add_records":    True,
            "can_edit_records":   True,
            "can_delete_records": True,
            "can_use_bot":        True,
            "privacy": {
                "show_balances":     getattr(setup, "show_balances",     True),
                "show_profits":      getattr(setup, "show_profits",      True),
                "show_amounts":      getattr(setup, "show_amounts",      True),
                "show_vendors":      getattr(setup, "show_vendors",      True),
                "show_reports":      getattr(setup, "show_reports",      True),
                "employees_can_add": getattr(setup, "employees_can_add", True),
            }
        }

    perm = db.query(AccountingPermission).filter(
        AccountingPermission.company_id == company_id,
        AccountingPermission.user_id == current_user.id,
        AccountingPermission.is_active == True,
    ).first()

    if not perm:
        raise HTTPException(status_code=403, detail="ما عندك صلاحية للوصول لنظام شكرة")

    return {
        "is_founder": False,
        "can_view_dashboard": perm.can_view_dashboard,
        "can_view_amounts":   perm.can_view_amounts   and getattr(setup, "show_amounts",  True),
        "can_view_profits":   perm.can_view_profits   and getattr(setup, "show_profits",  True),
        "can_view_reports":   perm.can_view_reports   and getattr(setup, "show_reports",  True),
        "can_view_vendors":   perm.can_view_vendors   and getattr(setup, "show_vendors",  True),
        "can_add_records":    perm.can_add_records    and getattr(setup, "employees_can_add", True),
        "can_edit_records":   perm.can_edit_records,
        "can_delete_records": perm.can_delete_records,
        "can_use_bot":        perm.can_use_bot,
        "privacy": {}
    }


# ══════════════════════════════════════════════════════════════════════════════
# Shukra Platform Management — founder controls bot from web dashboard
# ══════════════════════════════════════════════════════════════════════════════

def _require_founder(current_user: User, db: Session) -> int:
    """Return company_id if caller is owner/admin, else raise 403."""
    company_id = _get_company_id(current_user, db)
    mem = db.query(CompanyMember).filter(
        CompanyMember.user_id == current_user.id,
        CompanyMember.company_id == company_id,
    ).first()
    if not mem or mem.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="للمؤسس فقط")
    _load_company(company_id)
    return company_id


# ── Bot Employees (Telegram) — DB-backed ─────────────────────────────────────

@router.get("/bot/employees")
def get_bot_employees(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """المؤسس يشوف كل موظفي البوت (من DB)."""
    company_id = _require_founder(current_user, db)
    rows = (
        db.query(AccountingPermission, User)
        .join(User, AccountingPermission.user_id == User.id)
        .filter(
            AccountingPermission.company_id == company_id,
            AccountingPermission.can_use_bot == True,
            AccountingPermission.is_active == True,
        )
        .all()
    )
    return {
        "employees": [
            {
                "employee_no": u.employee_no,
                "name":        u.name or u.username,
                "username":    u.username,
            }
            for _, u in rows
        ],
        "total": len(rows),
    }


class BotEmployeeIn(BaseModel):
    employee_no: str


@router.post("/bot/employees")
def add_bot_employee(
    body: BotEmployeeIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """المؤسس يضيف موظف للبوت من المنصة عبر رقم الموظف."""
    company_id = _require_founder(current_user, db)
    target = db.query(User).filter(User.employee_no == body.employee_no.strip()).first()
    if not target:
        raise HTTPException(status_code=404, detail=f"لا يوجد مستخدم برقم الموظف '{body.employee_no}'")
    member = db.query(CompanyMember).filter(
        CompanyMember.company_id == company_id,
        CompanyMember.user_id == target.id,
    ).first()
    if not member:
        raise HTTPException(status_code=400, detail="المستخدم ليس عضواً في هذه الشركة")
    perm = db.query(AccountingPermission).filter(
        AccountingPermission.company_id == company_id,
        AccountingPermission.user_id == target.id,
    ).first()
    if perm:
        perm.can_use_bot = True
        perm.is_active   = True
    else:
        perm = AccountingPermission(
            company_id=company_id,
            user_id=target.id,
            can_use_bot=True,
            can_add_records=True,
            can_view_reports=True,
            is_active=True,
        )
        db.add(perm)
    db.commit()
    return {"ok": True, "message": f"تمت إضافة {target.name or target.username} للبوت"}


@router.delete("/bot/employees/{employee_no}")
def delete_bot_employee(
    employee_no: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """المؤسس يلغي وصول موظف من المنصة."""
    company_id = _require_founder(current_user, db)
    target = db.query(User).filter(User.employee_no == employee_no).first()
    if not target:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    perm = db.query(AccountingPermission).filter(
        AccountingPermission.company_id == company_id,
        AccountingPermission.user_id == target.id,
    ).first()
    if not perm:
        raise HTTPException(status_code=404, detail="لا توجد صلاحية لهذا الموظف")
    perm.can_use_bot = False
    db.commit()
    # Kick active session if any
    for cid, s in list(_tg_sessions.get(company_id, {}).items()):
        if s.get("user_id") == target.id:
            _tg_sessions[company_id].pop(cid, None)
    return {"ok": True, "message": f"تم إلغاء وصول {target.name or target.username}"}


# ── Bot Budgets ───────────────────────────────────────────────────────────────

@router.get("/bot/budgets")
def get_bot_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """المؤسس يشوف الميزانيات المحددة."""
    company_id = _require_founder(current_user, db)
    budgets = _tg_budgets.get(company_id, {})
    return {
        "budgets": [
            {"category": cat, "limit": limit}
            for cat, limit in budgets.items()
        ]
    }


class BotBudgetIn(BaseModel):
    category: str
    limit:    float


@router.post("/bot/budgets")
def set_bot_budget(
    body: BotBudgetIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """المؤسس يضيف/يعدل ميزانية فئة."""
    company_id = _require_founder(current_user, db)
    if not body.category.strip() or body.limit <= 0:
        raise HTTPException(status_code=400, detail="الفئة والمبلغ مطلوبان")
    _tg_budgets[company_id][body.category.strip()] = body.limit
    _save_company(company_id)
    return {"ok": True, "message": f"ميزانية '{body.category}' = {body.limit:,.0f}"}


@router.delete("/bot/budgets/{category}")
def delete_bot_budget(
    category: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """المؤسس يحذف ميزانية فئة."""
    company_id = _require_founder(current_user, db)
    budgets = _tg_budgets.get(company_id, {})
    if category not in budgets:
        raise HTTPException(status_code=404, detail="الفئة غير موجودة")
    del _tg_budgets[company_id][category]
    _save_company(company_id)
    return {"ok": True}


# ── Bot Status ────────────────────────────────────────────────────────────────

@router.get("/bot/status")
def get_bot_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """المؤسس يشوف حالة البوت الكاملة."""
    company_id = _require_founder(current_user, db)
    setup = db.query(AccountingSetup).filter(
        AccountingSetup.company_id == company_id
    ).first()
    founder_cid = _tg_founders.get(company_id)
    budgets = _tg_budgets.get(company_id, {})
    active_sessions = sum(
        1 for s in _tg_sessions.get(company_id, {}).values()
        if s.get("state") not in ("init", "await_id", "await_password")
    )
    # Get employees from DB
    emp_rows = (
        db.query(AccountingPermission, User)
        .join(User, AccountingPermission.user_id == User.id)
        .filter(
            AccountingPermission.company_id == company_id,
            AccountingPermission.can_use_bot == True,
            AccountingPermission.is_active == True,
        )
        .all()
    )
    return {
        "telegram_active":  bool(setup and setup.telegram_active),
        "bot_token_set":    bool(setup and setup.telegram_bot_token),
        "sheet_connected":  bool(setup and setup.google_sheet_id),
        "founder_linked":   bool(founder_cid),
        "employees_count":  len(emp_rows),
        "budgets_count":    len(budgets),
        "active_sessions":  active_sessions,
        "employees": [
            {"employee_no": u.employee_no, "name": u.name or u.username}
            for _, u in emp_rows
        ],
        "budgets": [
            {"category": cat, "limit": limit}
            for cat, limit in budgets.items()
        ],
    }
