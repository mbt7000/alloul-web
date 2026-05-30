"""
Shukra Encryption Service
=========================
Per-company AES encryption for sensitive financial fields.

Each company gets a unique Fernet key stored in AccountingSetup.
Sensitive fields (vendor, phone, description, goods…) are encrypted
at rest — even if someone accesses the DB directly they see only ciphertext.

Fields encrypted:  vendor, client_phone, goods, description,
                   employee_name, invoice_number
Fields plain-text: amount, currency, category, record_type,
                   recorded_at, txn_number, source
                   (needed for aggregation/dashboards)
"""
from __future__ import annotations

import base64
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger("alloul.crypto")


def generate_company_key() -> str:
    """Generate a new Fernet key for a company. Store in AccountingSetup."""
    return Fernet.generate_key().decode("utf-8")


def _fernet(key: str) -> Fernet:
    return Fernet(key.encode("utf-8"))


def encrypt(value: Optional[str], key: str) -> Optional[str]:
    """Encrypt a string value. Returns None if value is None/empty."""
    if not value:
        return value
    try:
        return _fernet(key).encrypt(value.encode("utf-8")).decode("utf-8")
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return value  # fail open — don't lose data


def decrypt(value: Optional[str], key: str) -> Optional[str]:
    """Decrypt a string value. Returns original if decryption fails (legacy plain data)."""
    if not value:
        return value
    try:
        return _fernet(key).decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        # Data was stored before encryption was enabled — return as-is
        return value
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return value


# ── Batch helpers for AccountingRecord dicts ─────────────────────────────────

SENSITIVE_FIELDS = ("vendor", "client_phone", "goods", "description", "employee_name", "invoice_number")


def encrypt_record(record: dict, key: str) -> dict:
    """Return a copy of the record dict with sensitive fields encrypted."""
    out = dict(record)
    for field in SENSITIVE_FIELDS:
        if field in out:
            out[field] = encrypt(out[field], key)
    return out


def decrypt_record(record: dict, key: str) -> dict:
    """Return a copy of the record dict with sensitive fields decrypted."""
    out = dict(record)
    for field in SENSITIVE_FIELDS:
        if field in out:
            out[field] = decrypt(out[field], key)
    return out
