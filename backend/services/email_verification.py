"""
Email verification token store.
Tokens are stored in-memory (fine for our scale) with 24h expiry.
"""
from __future__ import annotations

import secrets
import time
from typing import Optional

# token → (user_id, expires_at)
_store: dict[str, tuple[int, float]] = {}
_TTL = 60 * 60 * 24  # 24 hours


def create_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    _store[token] = (user_id, time.time() + _TTL)
    return token


def consume_token(token: str) -> Optional[int]:
    """Return user_id if token is valid, else None. Deletes after use."""
    entry = _store.pop(token, None)
    if entry is None:
        return None
    user_id, expires_at = entry
    if time.time() > expires_at:
        return None
    return user_id


def has_pending_token(user_id: int) -> bool:
    now = time.time()
    return any(
        uid == user_id and exp > now
        for uid, exp in _store.values()
    )


def revoke_user_tokens(user_id: int) -> None:
    keys = [t for t, (uid, _) in _store.items() if uid == user_id]
    for k in keys:
        _store.pop(k, None)
