"""
شكرة Bot Service — Enhanced v2
================================
Core processing engine:
  • Employee authentication (name + PIN, managed by founder)
  • Transaction numbering (TXN-YYYY-NNNN)
  • Download images from Telegram / WhatsApp
  • Extract invoice data using Claude Vision
  • Write enriched rows to company's Google Sheet
  • Send reply messages back to the user
"""
from __future__ import annotations

import base64
import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger("alloul.shukra")

# ─── Layer 0: Pure-regex extractor (no API, always works) ────────────────────

# Arabic-Indic → ASCII digits
_AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

# Income signals
_INCOME_KW = re.compile(
    r"بعت|بعنا|بعنا|استلمنا|قبضنا|حصلنا|ربحنا|وصل|دخل|إيراد|ايراد|مبيعات|بيع|باع|"
    r"sold|received|income|revenue|sale",
    re.IGNORECASE,
)
# Expense signals
_EXPENSE_KW = re.compile(
    r"اشتريت|اشترينا|شرا|شرينا|شراء|دفعت|دفعنا|صرفت|صرفنا|سددت|سددنا|"
    r"مصروف|نفقة|تكلف|كلف|فاتورة|bought|paid|expense|purchase",
    re.IGNORECASE,
)

# Currency detection: (pattern, ISO code)
_CURRENCIES = [
    (re.compile(r"ريال|ر\.س|SAR", re.I),  "SAR"),
    (re.compile(r"درهم إماراتي|درهم|د\.إ|AED", re.I), "AED"),
    (re.compile(r"دينار كويتي|KWD", re.I),  "KWD"),
    (re.compile(r"دينار بحريني|BHD", re.I), "BHD"),
    (re.compile(r"دينار أردني|JOD", re.I),  "JOD"),
    (re.compile(r"ريال عماني|OMR", re.I),   "OMR"),
    (re.compile(r"ريال قطري|QAR", re.I),    "QAR"),
    (re.compile(r"جنيه مصري|جنيه|EGP", re.I), "EGP"),
    (re.compile(r"دولار|dollar|\$|USD", re.I), "USD"),
    (re.compile(r"يورو|euro|EUR|€", re.I),  "EUR"),
    (re.compile(r"جنيه إسترليني|GBP|£", re.I), "GBP"),
    (re.compile(r"يوان|CNY", re.I),          "CNY"),
    (re.compile(r"درهم مغربي|MAD", re.I),    "MAD"),
]

# Category hints: (keyword pattern, category name)
_CATEGORIES = [
    (re.compile(r"سيار|مركب|شاحن|موتر|vehicle|car", re.I),            "مشتريات"),
    (re.compile(r"راتب|رواتب|أجر|salary|payroll", re.I),              "رواتب"),
    (re.compile(r"إيجار|أجار|أيجار|rent", re.I),                      "إيجار"),
    (re.compile(r"إعلان|تسويق|اعلان|market|ads|adverti", re.I),       "تسويق"),
    (re.compile(r"كهرباء|ماء|اتصال|انترنت|utility|internet", re.I),   "مصاريف تشغيل"),
    (re.compile(r"بضاع|مواد|مستلزم|بضائع|goods|material|stock", re.I),"مشتريات"),
    (re.compile(r"صيان|تصليح|repair|maintenance", re.I),              "صيانة"),
    (re.compile(r"سفر|تذكر|فندق|travel|hotel|ticket", re.I),          "مصاريف تشغيل"),
    (re.compile(r"قرط|مكتب|office|station", re.I),                    "مصاريف إدارية"),
]


def _regex_extract(text: str) -> dict:
    """
    Extract a transaction from Arabic/English text using regex only.
    Returns a dict compatible with the invoice schema, or {} if nothing found.
    """
    # Normalize Arabic-Indic digits
    text_n = text.translate(_AR_DIGITS)

    # Extract all numbers (integers or decimals, with optional commas)
    numbers = re.findall(r"\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\b", text_n)
    if not numbers:
        return {}

    # Pick largest number as the amount (usually the main transaction value)
    amounts = [float(n.replace(",", "")) for n in numbers]
    amount = max(amounts)
    if amount <= 0:
        return {}

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Determine type
    income_score  = len(_INCOME_KW.findall(text))
    expense_score = len(_EXPENSE_KW.findall(text))
    if income_score > expense_score:
        record_type = "income"
    else:
        record_type = "expense"  # default to expense (more common)

    # Currency
    currency = "SAR"
    for pattern, iso in _CURRENCIES:
        if pattern.search(text):
            currency = iso
            break

    # Category
    category = "مشتريات" if record_type == "expense" else "مبيعات"
    for pattern, cat in _CATEGORIES:
        if pattern.search(text):
            category = cat
            break

    # Vendor: first non-number word sequence of 2+ Arabic chars after common markers
    vendor = ""
    m = re.search(r"(?:لـ?|من|شركة|مؤسسة|محل)\s+([^\d،,.؟!]{2,30})", text)
    if m:
        vendor = m.group(1).strip()

    return {
        "amount":      amount,
        "currency":    currency,
        "date":        today,
        "vendor":      vendor,
        "category":    category,
        "description": text[:120],
        "record_type": record_type,
        "confidence":  0.6,   # medium — regex is decent but not perfect
        "source":      "regex",
    }


async def _gemini_extract(text: str) -> dict:
    """
    Extract transaction using Google Gemini (free tier — 1500 req/day).
    Uses REST API directly via httpx — no extra library needed.
    """
    try:
        from config import settings
        key = getattr(settings, "GEMINI_API_KEY", None)
        if not key:
            return {}
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        prompt = (
            f'اليوم: {today}. استخرج المعاملة المالية وأعد JSON فقط بدون أي نص آخر:\n"{text}"\n\n'
            'قواعد العملة: ريال/ر.س→SAR، درهم→AED، دينار كويتي→KWD، دولار→USD، يورو→EUR، '
            'جنيه مصري→EGP. بدون ذكر عملة→SAR\n\n'
            f'{{"amount":5000,"currency":"SAR","date":"{today}","vendor":"",'
            '"category":"مشتريات","description":"وصف","record_type":"expense","confidence":0.9}}'
        )
        model = "gemini-2.0-flash-lite"
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models"
            f"/{model}:generateContent?key={key}"
        )
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(url, json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.0, "maxOutputTokens": 250},
            })
            if r.status_code == 429:
                logger.warning("Gemini quota limit reached — falling back to regex")
                return {}
            if r.status_code != 200:
                logger.warning(f"Gemini extract HTTP {r.status_code}")
                return {}
            raw = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            if m:
                invoice = json.loads(m.group())
                invoice.setdefault("date", today)
                invoice["source"] = "gemini"
                return invoice
    except Exception as e:
        logger.warning(f"Gemini extract failed: {e}")
    return {}


async def _ollama_extract(text: str) -> dict:
    """
    Extract transaction using local Ollama (free — llama3.2:3b on same server).
    Calls localhost:11434 directly — zero cost, always available.
    """
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        prompt = (
            f'اليوم: {today}. استخرج المعاملة المالية وأعد JSON فقط بدون أي نص آخر:\n"{text}"\n\n'
            'قواعد العملة: ريال/ر.س→SAR، درهم→AED، دينار كويتي→KWD، دولار→USD، يورو→EUR، '
            f'جنيه مصري→EGP. بدون ذكر عملة→SAR\n\n'
            f'{{"amount":5000,"currency":"SAR","date":"{today}","vendor":"",'
            '"category":"مشتريات","description":"وصف","record_type":"expense","confidence":0.88}}'
        )
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "http://localhost:11434/api/generate",
                json={"model": "llama3.2:3b", "prompt": prompt, "stream": False},
            )
            if r.status_code != 200:
                logger.warning(f"Ollama extract HTTP {r.status_code}")
                return {}
            raw = r.json().get("response", "").strip()
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            if m:
                invoice = json.loads(m.group())
                invoice.setdefault("date", today)
                invoice["source"] = "ollama"
                return invoice
    except Exception as e:
        logger.warning(f"Ollama extract failed: {e}")
    return {}


async def _claude_extract_text(text: str) -> dict:
    """Extract transaction using Anthropic Claude Haiku."""
    try:
        import anthropic
        from config import settings
        if not settings.ANTHROPIC_API_KEY:
            return {}
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        ai_msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": (
                    f'اليوم: {today}. استخرج المعاملة المالية وأعد JSON فقط:\n"{text}"\n\n'
                    'قواعد العملة: ريال/ر.س→SAR، درهم/د.إ→AED، دينار كويتي→KWD، '
                    'دولار/dollar→USD، يورو/euro→EUR، جنيه مصري→EGP. بدون عملة→SAR\n\n'
                    '{"amount":100000,"currency":"SAR","date":"' + today + '","vendor":"لاند كروزر",'
                    '"category":"مشتريات","description":"شراء سيارة","record_type":"expense","confidence":0.95}'
                )
            }]
        )
        raw = ai_msg.content[0].text.strip()
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            invoice = json.loads(m.group())
            invoice.setdefault("date", today)
            invoice["source"] = "claude"
            return invoice
    except Exception as e:
        logger.warning(f"Claude extract failed: {e}")
    return {}


async def extract_text_transaction(text: str) -> dict:
    """
    Multi-layer transaction extractor:
    1. Claude Haiku      (best accuracy — when credits available)
    2. Gemini Flash      (free 1500 req/day — Google AI)
    3. ALLOUL Agent      (free — Ollama on GCP, when model is pulled)
    4. Regex parser      (always works, zero API, guaranteed)
    """
    # Layer 1: Claude
    result = await _claude_extract_text(text)
    if result.get("amount"):
        return result

    # Layer 2: Gemini (free tier)
    result = await _gemini_extract(text)
    if result.get("amount"):
        return result

    # Layer 3: Ollama local (llama3.2:3b — free, same server)
    result = await _ollama_extract(text)
    if result.get("amount"):
        return result

    # Layer 4: Regex fallback — never fails
    result = _regex_extract(text)
    if result.get("amount"):
        logger.info("Used regex fallback for text extraction")
        return result

    return {}


# ─── AI Invoice Extraction ────────────────────────────────────────────────────

EXTRACT_PROMPT = """أنت محاسب ذكي. استخرج من هذه الفاتورة المعلومات التالية بتنسيق JSON فقط بدون أي نص آخر:

{
  "amount": (رقم فقط بدون عملة، مثال: 1250.00),
  "currency": (رمز ISO للعملة — ريال سعودي=SAR، درهم إماراتي=AED، دينار كويتي=KWD، دينار بحريني=BHD، ريال عماني=OMR، ريال قطري=QAR، دينار أردني=JOD، جنيه مصري=EGP، دولار=USD، يورو=EUR، جنيه إسترليني=GBP، يوان=CNY، ين=JPY، روبية=INR، درهم مغربي=MAD — استخدم الرمز دائماً),
  "date": (تاريخ الفاتورة بصيغة YYYY-MM-DD),
  "vendor": (اسم البائع أو المورد أو الجهة),
  "category": (اختر الأنسب: مبيعات / مشتريات / رواتب / إيجار / مصاريف تشغيل / تسويق / خدمات / أخرى),
  "invoice_number": (رقم الفاتورة إن وجد وإلا null),
  "description": (وصف مختصر للمنتج أو الخدمة),
  "record_type": (income إذا إيراد للشركة / expense إذا مصروف),
  "confidence": (رقم من 0.0 إلى 1.0 يعبر عن مستوى ثقتك في الاستخراج)
}

إذا لم تتمكن من تحديد قيمة معينة اجعلها null.
أعد JSON فقط بدون أي شرح."""


async def extract_invoice_from_image(
    image_bytes: bytes,
    media_type: str = "image/jpeg",
    api_key: Optional[str] = None,
) -> dict:
    """
    Use Claude Vision to extract invoice data from an image.
    Returns a dict with: amount, currency, date, vendor, category,
    invoice_number, description, record_type, confidence
    """
    try:
        import anthropic
        from config import settings

        key = api_key or settings.ANTHROPIC_API_KEY
        client = anthropic.Anthropic(api_key=key)

        image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

        msg = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": EXTRACT_PROMPT},
                    ],
                }
            ],
        )

        raw = msg.content[0].text.strip()
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"confidence": 0.0, "error": "no_json"}

    except Exception as e:
        logger.error(f"Invoice extraction failed: {e}")
        return {"confidence": 0.0, "error": str(e)}


# ─── Google Sheets Writer ─────────────────────────────────────────────────────

SHEET_HEADERS = [
    "#",                 # A — row number
    "رقم المعاملة",      # B — TXN-2026-NNNN
    "التاريخ",           # C
    "النوع",             # D — 📈 إيراد / 📉 مصروف
    "المبلغ",            # E
    "العملة",            # F
    "المنشئ",            # G — employee name
    "العميل / المورد",   # H
    "هاتف العميل",       # I
    "البضاعة / الخدمة",  # J
    "الفئة",             # K
    "رقم الفاتورة",      # L
    "المدة",             # M — payment duration
    "حالة الدفع",        # N — paid / unpaid / partial
    "الوصف",             # O
    "المصدر",            # P
    "الثقة",             # Q
    "وقت التسجيل",       # R
]

_NUM_COLS = len(SHEET_HEADERS)   # 18
_LAST_COL = "R"

SHUKRA_SERVICE_EMAIL = "shukra@alloul-ai.iam.gserviceaccount.com"

# Colors
_GREEN_BG  = {"red": 0.851, "green": 0.937, "blue": 0.855}  # income row
_RED_BG    = {"red": 0.988, "green": 0.878, "blue": 0.878}  # expense row
_HEADER_BG = {"red": 0.129, "green": 0.129, "blue": 0.129}  # dark header
_WHITE     = {"red": 1.0,   "green": 1.0,   "blue": 1.0}
_GOLD      = {"red": 1.0,   "green": 0.843, "blue": 0.0}


async def get_txn_row(sheet_id: str, txn_number: str, service_account_path: Optional[str] = None) -> Optional[dict]:
    """
    Find a transaction by TXN number in the sheet.
    Returns dict with row_index (1-based) and current field values, or None if not found.
    """
    try:
        import gspread
        from google.oauth2.service_account import Credentials
        import os

        sa_path = (
            service_account_path
            or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            or "/root/allou-backend/firebase-service-account.json"
        )
        scopes = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ]
        creds = Credentials.from_service_account_file(sa_path, scopes=scopes)
        gc   = gspread.authorize(creds)
        sh   = gc.open_by_key(sheet_id)
        ws   = sh.worksheet("شكرة — السجلات المالية")

        all_vals = ws.get_all_values()
        # Data starts at row 4 (index 3); column B (index 1) = TXN number
        for i, row in enumerate(all_vals):
            if len(row) > 1 and row[1] == txn_number:
                row_index = i + 1  # 1-based
                return {
                    "row_index": row_index,
                    "ws":        ws,
                    "txn":       row[1]  if len(row) > 1  else "",
                    "date":      row[2]  if len(row) > 2  else "",
                    "type":      row[3]  if len(row) > 3  else "",
                    "amount":    row[4]  if len(row) > 4  else "",
                    "currency":  row[5]  if len(row) > 5  else "",
                    "employee":  row[6]  if len(row) > 6  else "",
                    "client":    row[7]  if len(row) > 7  else "",
                    "phone":     row[8]  if len(row) > 8  else "",
                    "goods":     row[9]  if len(row) > 9  else "",
                    "category":  row[10] if len(row) > 10 else "",
                    "invoice":   row[11] if len(row) > 11 else "",
                    "duration":  row[12] if len(row) > 12 else "",
                    "payment":   row[13] if len(row) > 13 else "",
                    "desc":      row[14] if len(row) > 14 else "",
                    "_ws_obj":   ws,
                    "_sh_obj":   sh,
                }
        return None
    except Exception as e:
        logger.error(f"get_txn_row failed: {e}")
        return None


async def update_txn_field(
    sheet_id: str,
    txn_number: str,
    field: str,
    new_value: str,
    editor_name: str = "",
    service_account_path: Optional[str] = None,
) -> bool:
    """
    Update a single field of a transaction row by TXN number.
    field must be one of: amount, currency, type, client, phone, goods,
    category, duration, payment, desc, date
    """
    # Map field name → column letter
    FIELD_COL = {
        "date":     "C",
        "type":     "D",
        "amount":   "E",
        "currency": "F",
        "client":   "H",
        "phone":    "I",
        "goods":    "J",
        "category": "K",
        "duration": "M",
        "payment":  "N",
        "desc":     "O",
    }
    col = FIELD_COL.get(field)
    if not col:
        return False

    try:
        import gspread
        from google.oauth2.service_account import Credentials
        import os

        sa_path = (
            service_account_path
            or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            or "/root/allou-backend/firebase-service-account.json"
        )
        scopes = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ]
        creds = Credentials.from_service_account_file(sa_path, scopes=scopes)
        gc    = gspread.authorize(creds)
        sh    = gc.open_by_key(sheet_id)
        ws    = sh.worksheet("شكرة — السجلات المالية")

        all_vals = ws.get_all_values()
        for i, row in enumerate(all_vals):
            if len(row) > 1 and row[1] == txn_number:
                row_index = i + 1
                ws.update(f"{col}{row_index}", [[new_value]])
                # Add edit note in description column if space
                if field != "desc":
                    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
                    try:
                        current_desc = row[14] if len(row) > 14 else ""
                        edit_note = f"[عُدِّل {field} → {new_value} بواسطة {editor_name} في {now_str}]"
                        new_desc = f"{current_desc} {edit_note}".strip()
                        ws.update(f"O{row_index}", [[new_desc]])
                    except Exception:
                        pass
                # Recolor row based on type
                is_income = "إيراد" in (row[3] if len(row) > 3 else "")
                if field == "type":
                    is_income = "إيراد" in new_value
                bg = _GREEN_BG if is_income else _RED_BG
                ws.format(f"A{row_index}:{_LAST_COL}{row_index}", {"backgroundColor": bg})
                logger.info(f"Updated {txn_number} field={field} new={new_value} by={editor_name}")
                return True
        return False
    except Exception as e:
        logger.error(f"update_txn_field failed: {e}")
        return False


def generate_txn_number(ws, year: Optional[int] = None) -> str:
    """Generate sequential transaction number TXN-YYYY-NNNN."""
    yr = year or datetime.now(timezone.utc).year
    try:
        all_vals = ws.get_all_values()
        # Column B (index 1) has TXN numbers; data starts at row 4 (index 3)
        txn_rows = [r for r in all_vals[3:] if len(r) > 1 and str(r[1]).startswith("TXN-")]
        n = len(txn_rows) + 1
    except Exception:
        n = 1
    return f"TXN-{yr}-{n:04d}"


async def write_to_google_sheet(
    sheet_id: str,
    invoice: dict,
    source: str = "telegram",
    company_name: str = "",
    service_account_path: Optional[str] = None,
    # Enhanced fields
    employee_name: str = "",
    client_name: str = "",
    client_phone: str = "",
    goods: str = "",
    duration: str = "",
    payment_status: str = "مدفوع",
) -> tuple[bool, str]:
    """
    Append a professional invoice row to the company's Google Sheet.
    Returns (success, txn_number).
    """
    txn_number = ""
    try:
        import gspread
        from google.oauth2.service_account import Credentials
        import os

        # ── Credentials ──────────────────────────────────────────────────────
        sa_path = (
            service_account_path
            or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            or "/root/allou-backend/firebase-service-account.json"
        )
        logger.info(f"Using service account: {sa_path}")
        scopes = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ]
        creds = Credentials.from_service_account_file(sa_path, scopes=scopes)
        gc = gspread.authorize(creds)
        sh = gc.open_by_key(sheet_id)

        # ── Get / create worksheet ────────────────────────────────────────────
        ws_name = "شكرة — السجلات المالية"
        try:
            ws = sh.worksheet(ws_name)
        except gspread.exceptions.WorksheetNotFound:
            ws = sh.add_worksheet(ws_name, rows=3000, cols=_NUM_COLS)

        # Setup header if sheet is empty
        first_cell = ws.acell("A1").value or ""
        if first_cell != "#" and "شكرة" not in first_cell:
            _setup_sheet_header(ws, sh, company_name)

        # ── Count existing data rows & generate TXN number ────────────────────
        txn_number = generate_txn_number(ws)
        all_vals = ws.get_all_values()
        data_rows = [r for r in all_vals if r and str(r[0]).isdigit()]
        row_num = len(data_rows) + 1

        record_type = invoice.get("record_type", "expense")
        is_income   = record_type == "income"

        # Merge goods: prefer explicit goods param, else use vendor/description
        goods_val = goods or invoice.get("vendor") or invoice.get("description") or ""

        row = [
            row_num,
            txn_number,
            invoice.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "📈 إيراد" if is_income else "📉 مصروف",
            invoice.get("amount") or "",
            invoice.get("currency") or "SAR",
            employee_name or "—",
            client_name or invoice.get("vendor") or "—",
            client_phone or "—",
            goods_val or "—",
            invoice.get("category") or "",
            invoice.get("invoice_number") or "—",
            duration or "—",
            payment_status or "مدفوع",
            invoice.get("description") or "",
            source,
            f"{float(invoice.get('confidence', 0)) * 100:.0f}%",
            datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        ]
        ws.append_row(row, value_input_option="USER_ENTERED")

        # ── Color new row ─────────────────────────────────────────────────────
        try:
            new_idx = len(ws.get_all_values())
            bg = _GREEN_BG if is_income else _RED_BG
            ws.format(f"A{new_idx}:{_LAST_COL}{new_idx}", {
                "backgroundColor": bg,
                "horizontalAlignment": "CENTER",
                "textFormat": {"fontSize": 11},
            })
        except Exception as fmt_err:
            logger.warning(f"Row color skipped: {fmt_err}")

        logger.info(f"Wrote row {row_num} ({txn_number}) to sheet {sheet_id}")
        return True, txn_number

    except Exception as e:
        logger.error(f"Google Sheet write failed: {type(e).__name__}: {e}")
        return False, txn_number


def _setup_sheet_header(ws, sh, company_name: str = "") -> None:
    """Build professional header — title + summary + column headers."""
    try:
        title = company_name or "شركة"
        n = _NUM_COLS
        empty_cols = [""] * (n - 1)

        # Row 1 — title
        ws.update(f"A1:{_LAST_COL}1", [[
            f"🏢 {title} — نظام شكرة المالي",
            *empty_cols
        ]])
        ws.merge_cells(f"A1:{_LAST_COL}1")
        ws.format(f"A1:{_LAST_COL}1", {
            "backgroundColor": _HEADER_BG,
            "textFormat": {"bold": True, "fontSize": 15, "foregroundColor": _GOLD},
            "horizontalAlignment": "CENTER",
            "verticalAlignment": "MIDDLE",
        })

        # Row 2 — summary (إيرادات / مصروفات / صافي)
        # Amounts are in column E (index 5), types in column D (index 4)
        summary_row = [
            "📊 إجمالي الإيرادات",
            '=SUMIF(D4:D3000,"📈 إيراد",E4:E3000)',
            "📉 إجمالي المصروفات",
            '=SUMIF(D4:D3000,"📉 مصروف",E4:E3000)',
            "💰 صافي الربح",
            "=B2-D2",
            *[""] * (n - 6)
        ]
        ws.update(f"A2:{_LAST_COL}2", [summary_row])
        ws.format(f"A2:{_LAST_COL}2", {
            "backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.2},
            "textFormat": {"bold": True, "fontSize": 11, "foregroundColor": _WHITE},
            "horizontalAlignment": "CENTER",
        })

        # Row 3 — column headers
        ws.update(f"A3:{_LAST_COL}3", [SHEET_HEADERS])
        ws.format(f"A3:{_LAST_COL}3", {
            "backgroundColor": {"red": 0.15, "green": 0.15, "blue": 0.15},
            "textFormat": {"bold": True, "fontSize": 11, "foregroundColor": _GOLD},
            "horizontalAlignment": "CENTER",
        })

        # Freeze top 3 rows
        sh.batch_update({"requests": [{
            "updateSheetProperties": {
                "properties": {
                    "sheetId": ws.id,
                    "gridProperties": {"frozenRowCount": 3},
                },
                "fields": "gridProperties.frozenRowCount",
            }
        }]})

        logger.info("Sheet header created (v2 — 18 columns)")
    except Exception as e:
        logger.warning(f"Header setup warning: {e}")


# ─── Telegram Helpers ─────────────────────────────────────────────────────────

async def download_telegram_file(bot_token: str, file_id: str) -> tuple[bytes, str]:
    """Download a file from Telegram. Returns (bytes, media_type)."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"https://api.telegram.org/bot{bot_token}/getFile",
            params={"file_id": file_id},
        )
        r.raise_for_status()
        file_path = r.json()["result"]["file_path"]

        dl = await client.get(
            f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
        )
        dl.raise_for_status()

        ext = file_path.split(".")[-1].lower()
        media_type = {
            "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "png": "image/png", "webp": "image/webp",
            "pdf": "application/pdf",
        }.get(ext, "image/jpeg")

        return dl.content, media_type


async def send_telegram_message(bot_token: str, chat_id: int | str, text: str) -> None:
    """Send a text message via Telegram Bot API."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            )
    except Exception as e:
        logger.warning(f"Telegram send failed: {e}")


async def set_telegram_webhook(bot_token: str, webhook_url: str) -> bool:
    """Register webhook URL with Telegram."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"https://api.telegram.org/bot{bot_token}/setWebhook",
                json={"url": webhook_url, "drop_pending_updates": True},
            )
            result = r.json()
            return result.get("ok", False)
    except Exception as e:
        logger.error(f"Set Telegram webhook failed: {e}")
        return False


# ─── WhatsApp Helpers ─────────────────────────────────────────────────────────

async def download_whatsapp_media(
    media_id: str,
    access_token: str,
) -> tuple[bytes, str]:
    """Download media from WhatsApp Cloud API."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"https://graph.facebook.com/v19.0/{media_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        r.raise_for_status()
        media_url = r.json()["url"]
        mime_type = r.json().get("mime_type", "image/jpeg")

        dl = await client.get(
            media_url,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        dl.raise_for_status()
        return dl.content, mime_type


async def send_whatsapp_message(
    phone_number_id: str,
    access_token: str,
    to: str,
    text: str,
) -> None:
    """Send a text message via WhatsApp Cloud API."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"https://graph.facebook.com/v19.0/{phone_number_id}/messages",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "to": to,
                    "type": "text",
                    "text": {"body": text},
                },
            )
    except Exception as e:
        logger.warning(f"WhatsApp send failed: {e}")


# ─── Reply Formatters ─────────────────────────────────────────────────────────

def format_success_reply(
    invoice: dict,
    sheet_written: bool,
    txn_number: str = "",
    employee_name: str = "",
    client_name: str = "",
    payment_status: str = "",
) -> str:
    amount   = invoice.get("amount", "؟")
    currency = invoice.get("currency", "")
    category = invoice.get("category", "؟")
    date     = invoice.get("date", "؟")
    conf     = float(invoice.get("confidence", 0))
    r_type   = "📈 إيراد" if invoice.get("record_type") == "income" else "📉 مصروف"
    review   = conf < 0.7

    lines = ["✅ تم تسجيل المعاملة بنجاح", ""]
    if txn_number:
        lines.append(f"🔢 رقم المعاملة: <b>{txn_number}</b>")
    lines += [
        f"{r_type}",
        f"💰 المبلغ: {amount} {currency}",
        f"📂 الفئة: {category}",
        f"📅 التاريخ: {date}",
    ]
    if employee_name:
        lines.append(f"👤 المنشئ: {employee_name}")
    if client_name and client_name != "—":
        lines.append(f"🏪 العميل/المورد: {client_name}")
    if payment_status and payment_status != "—":
        lines.append(f"💳 حالة الدفع: {payment_status}")
    if sheet_written:
        lines.append("📊 تم الحفظ في Google Sheet")
    if review:
        lines.append("⚠️ يُنصح بمراجعة البيانات يدوياً")

    return "\n".join(lines)


def format_error_reply() -> str:
    return (
        "⚠️ لم أتمكن من قراءة الفاتورة بوضوح.\n\n"
        "تأكد من:\n"
        "• الصورة واضحة وغير مقلوبة\n"
        "• الأرقام مقروءة\n\n"
        "ثم أعد الإرسال."
    )
