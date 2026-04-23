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
import secrets
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
from models import User

try:
    from services.shukra_bot import (
        extract_invoice_from_image,
        write_to_google_sheet,
        download_telegram_file,
        send_telegram_message,
        set_telegram_webhook,
        download_whatsapp_media,
        send_whatsapp_message,
        format_success_reply,
        format_error_reply,
        SHUKRA_SERVICE_EMAIL,
    )
    BOT_SERVICE_AVAILABLE = True
except ImportError:
    BOT_SERVICE_AVAILABLE = False

logger = logging.getLogger("alloul.accounting")

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

    token = setup.telegram_bot_token
    message = body.get("message") or body.get("channel_post") or {}
    chat_id = message.get("chat", {}).get("id")
    if not chat_id:
        return {"ok": True}

    text_msg = message.get("text", "").strip()

    # /start command
    if text_msg == "/start":
        await send_telegram_message(
            token, chat_id,
            "مرحباً بك في شكرة 📊\n\nيمكنك:\n• إرسال صورة فاتورة 📷\n• أو كتابة المعاملة نصاً مثل:\n  «اشتريت لاند كروزر بسعر 100000 ريال»\n  «بعنا بضاعة بـ 5000 دولار»\n\nالبيانات تُحفظ في Google Sheet الخاص بشركتك."
        )
        return {"ok": True}

    # Text message — extract transaction using Claude Haiku (cheap + fast)
    if text_msg and not message.get("photo") and not message.get("document"):
        await send_telegram_message(token, chat_id, "⏳ جاري تسجيل المعاملة...")
        invoice = {}
        try:
            import anthropic, json, re
            from config import settings
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            ai_msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=256,
                messages=[{
                    "role": "user",
                    "content": (
                        f'اليوم: {today}. استخرج المعاملة المالية وأعد JSON فقط:\n"{text_msg}"\n\n'
                        'قواعد العملة: ريال/ر.س→SAR، درهم/د.إ→AED، دينار كويتي→KWD، دينار بحريني→BHD، '
                        'ريال عماني→OMR، ريال قطري→QAR، دينار أردني→JOD، جنيه مصري→EGP، '
                        'دولار/dollar→USD، يورو/euro→EUR، جنيه إسترليني→GBP، يوان/yuan→CNY، '
                        'ين/yen→JPY، روبية/rupee→INR، درهم مغربي→MAD. بدون عملة→SAR\n\n'
                        '{"amount":100000,"currency":"SAR","date":"' + today + '","vendor":"لاند كروزر",'
                        '"category":"مشتريات","description":"شراء سيارة","record_type":"expense","confidence":0.95}'
                    )
                }]
            )
            raw = ai_msg.content[0].text.strip()
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                invoice = json.loads(match.group())
            invoice.setdefault("date", today)
            logger.info(f"Text extraction: {invoice}")
            invoice.setdefault("date", today)
            logger.info(f"Text extraction result: {invoice}")
        except Exception as e:
            logger.error(f"Text invoice extraction failed: {e}")

        if not invoice or not invoice.get("amount"):
            await send_telegram_message(
                token, chat_id,
                "⚠️ لم أفهم المبلغ. تأكد من ذكر الرقم مثلاً:\n«اشتريت لاند كروزر بـ 100000 ريال»\n«بعنا بضاعة بـ 5000 دولار»"
            )
            return {"ok": True}

        sheet_ok = False
        if setup.google_sheet_id:
            sheet_ok = await write_to_google_sheet(setup.google_sheet_id, invoice, source="telegram_text", company_name=company_name)
        await _save_invoice_record(db, company_id, invoice, "telegram_text", setup)
        await send_telegram_message(token, chat_id, format_success_reply(invoice, sheet_ok))
        return {"ok": True}

    # Photo message
    photo_list = message.get("photo")
    document = message.get("document")

    file_id = None
    if photo_list:
        file_id = photo_list[-1]["file_id"]  # largest size
    elif document and document.get("mime_type", "").startswith("image"):
        file_id = document["file_id"]

    if not file_id:
        await send_telegram_message(token, chat_id, "📎 أرسل صورة فاتورة أو اكتب المعاملة نصاً.")
        return {"ok": True}

    # Acknowledge immediately
    await send_telegram_message(token, chat_id, "⏳ جاري معالجة الفاتورة...")

    try:
        image_bytes, media_type = await download_telegram_file(token, file_id)
        invoice = await extract_invoice_from_image(image_bytes, media_type)

        if not invoice or invoice.get("confidence", 0) == 0:
            await send_telegram_message(token, chat_id, format_error_reply())
            return {"ok": True}

        # Write to Google Sheet
        sheet_ok = False
        if setup.google_sheet_id:
            sheet_ok = await write_to_google_sheet(setup.google_sheet_id, invoice, source="telegram", company_name=company_name)

        # Save metadata
        await _save_invoice_record(db, company_id, invoice, "telegram", setup)

        # Reply
        await send_telegram_message(token, chat_id, format_success_reply(invoice, sheet_ok))

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
        setup, _ = _get_setup_by_icode(i_code, db)
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

        sheet_ok = False
        if setup.google_sheet_id:
            sheet_ok = await write_to_google_sheet(setup.google_sheet_id, invoice, source="whatsapp", company_name=company_name)

        await _save_invoice_record(db, company_id, invoice, "whatsapp", setup)
        await send_whatsapp_message(phone_id, access_tok, from_, format_success_reply(invoice, sheet_ok))

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
