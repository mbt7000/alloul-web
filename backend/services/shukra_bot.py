"""
شكرة Bot Service
=================
Core processing engine:
  • Download images from Telegram / WhatsApp
  • Extract invoice data using Claude Vision
  • Write details to company's Google Sheet
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
        # Extract JSON block
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"confidence": 0.0, "error": "no_json"}

    except Exception as e:
        logger.error(f"Invoice extraction failed: {e}")
        return {"confidence": 0.0, "error": str(e)}


# ─── Google Sheets Writer ─────────────────────────────────────────────────────

SHEET_HEADERS = [
    "#", "التاريخ", "النوع", "المبلغ", "العملة",
    "الجهة / المنتج", "الفئة", "رقم الفاتورة",
    "الوصف", "المصدر", "الثقة", "وقت التسجيل",
]

SHUKRA_SERVICE_EMAIL = "shukra@alloul-ai.iam.gserviceaccount.com"

# Colors
_GREEN_BG  = {"red": 0.851, "green": 0.937, "blue": 0.855}  # income row
_RED_BG    = {"red": 0.988, "green": 0.878, "blue": 0.878}  # expense row
_HEADER_BG = {"red": 0.129, "green": 0.129, "blue": 0.129}  # dark header
_WHITE     = {"red": 1.0,   "green": 1.0,   "blue": 1.0}
_GOLD      = {"red": 1.0,   "green": 0.843, "blue": 0.0}


def _col(letter: str) -> int:
    return ord(letter.upper()) - ord("A") + 1


async def write_to_google_sheet(
    sheet_id: str,
    invoice: dict,
    source: str = "telegram",
    company_name: str = "",
    service_account_path: Optional[str] = None,
) -> bool:
    """Append a professional invoice row to the company's Google Sheet."""
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
            ws = sh.add_worksheet(ws_name, rows=3000, cols=len(SHEET_HEADERS))

        # Setup header if sheet is empty
        first_cell = ws.acell("A1").value or ""
        if first_cell != "#":
            _setup_sheet_header(ws, sh, company_name)

        # ── Count existing data rows ──────────────────────────────────────────
        all_vals = ws.get_all_values()
        data_rows = [r for r in all_vals if r and str(r[0]).isdigit()]
        row_num = len(data_rows) + 1

        record_type = invoice.get("record_type", "expense")
        is_income   = record_type == "income"

        row = [
            row_num,
            invoice.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "📈 إيراد" if is_income else "📉 مصروف",
            invoice.get("amount") or "",
            invoice.get("currency") or "SAR",
            invoice.get("vendor") or "",
            invoice.get("category") or "",
            invoice.get("invoice_number") or "—",
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
            ws.format(f"A{new_idx}:L{new_idx}", {
                "backgroundColor": bg,
                "horizontalAlignment": "CENTER",
                "textFormat": {"fontSize": 11},
            })
        except Exception as fmt_err:
            logger.warning(f"Row color skipped: {fmt_err}")

        logger.info(f"Wrote row {row_num} to sheet {sheet_id}")
        return True

    except Exception as e:
        logger.error(f"Google Sheet write failed: {type(e).__name__}: {e}")
        return False


def _setup_sheet_header(ws, sh, company_name: str = "") -> None:
    """Build professional header — title + summary + column headers."""
    try:
        title = company_name or "شركة"

        # Row 1 — title
        ws.update("A1:L1", [[
            f"🏢 {title} — نظام شكرة المالي",
            "", "", "", "", "", "", "", "", "", "", ""
        ]])
        ws.merge_cells("A1:L1")
        ws.format("A1:L1", {
            "backgroundColor": _HEADER_BG,
            "textFormat": {"bold": True, "fontSize": 15, "foregroundColor": _GOLD},
            "horizontalAlignment": "CENTER",
            "verticalAlignment": "MIDDLE",
        })

        # Row 2 — summary (إيرادات / مصروفات / صافي)
        ws.update("A2:L2", [[
            "📊 إجمالي الإيرادات",
            '=SUMIF(C4:C3000,"📈 إيراد",D4:D3000)',
            "📉 إجمالي المصروفات",
            '=SUMIF(C4:C3000,"📉 مصروف",D4:D3000)',
            "💰 صافي الربح",
            "=B2-D2",
            "", "", "", "", "", ""
        ]])
        ws.format("A2:L2", {
            "backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.2},
            "textFormat": {"bold": True, "fontSize": 11, "foregroundColor": _WHITE},
            "horizontalAlignment": "CENTER",
        })

        # Row 3 — column headers
        ws.update("A3:L3", [SHEET_HEADERS])
        ws.format("A3:L3", {
            "backgroundColor": {"red": 0.15, "green": 0.15, "blue": 0.15},
            "textFormat": {"bold": True, "fontSize": 11, "foregroundColor": _GOLD},
            "horizontalAlignment": "CENTER",
        })

        # Freeze top 3 rows via batch_update
        sh.batch_update({"requests": [{
            "updateSheetProperties": {
                "properties": {
                    "sheetId": ws.id,
                    "gridProperties": {"frozenRowCount": 3},
                },
                "fields": "gridProperties.frozenRowCount",
            }
        }]})

        logger.info("Sheet header created")
    except Exception as e:
        logger.warning(f"Header setup warning: {e}")


# ─── Telegram Helpers ─────────────────────────────────────────────────────────

async def download_telegram_file(bot_token: str, file_id: str) -> tuple[bytes, str]:
    """Download a file from Telegram. Returns (bytes, media_type)."""
    async with httpx.AsyncClient(timeout=30) as client:
        # Get file path
        r = await client.get(
            f"https://api.telegram.org/bot{bot_token}/getFile",
            params={"file_id": file_id},
        )
        r.raise_for_status()
        file_path = r.json()["result"]["file_path"]

        # Download
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
        # Get media URL
        r = await client.get(
            f"https://graph.facebook.com/v19.0/{media_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        r.raise_for_status()
        media_url = r.json()["url"]
        mime_type = r.json().get("mime_type", "image/jpeg")

        # Download
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


# ─── Reply Formatter ──────────────────────────────────────────────────────────

def format_success_reply(invoice: dict, sheet_written: bool) -> str:
    amount   = invoice.get("amount", "؟")
    currency = invoice.get("currency", "")
    category = invoice.get("category", "؟")
    date     = invoice.get("date", "؟")
    vendor   = invoice.get("vendor", "")
    conf     = float(invoice.get("confidence", 0))
    r_type   = "📈 إيراد" if invoice.get("record_type") == "income" else "📉 مصروف"
    review   = conf < 0.7

    lines = [
        "✅ تم تسجيل الفاتورة",
        "",
        f"{r_type}",
        f"💰 المبلغ: {amount} {currency}",
        f"📂 الفئة: {category}",
        f"📅 التاريخ: {date}",
    ]
    if vendor:
        lines.append(f"🏪 الجهة: {vendor}")
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
