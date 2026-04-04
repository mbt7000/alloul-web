"""
Firebase Admin: verify ID token and return decoded claims.
Optional: if GOOGLE_APPLICATION_CREDENTIALS is not set, returns None and endpoint will 503.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

_firebase_app = None


def _resolve_credential_path() -> Optional[str]:
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path:
        return None

    candidate = Path(cred_path)
    if candidate.is_file():
        return str(candidate)

    backend_dir = Path(__file__).resolve().parent
    repo_root = backend_dir.parent

    fallback_candidates = [
        backend_dir / cred_path,
        repo_root / cred_path,
    ]
    for path in fallback_candidates:
        if path.is_file():
            return str(path)

    return None


def is_firebase_configured() -> bool:
    """True if a service account path is set and the file exists (does not initialize the SDK)."""
    return bool(_resolve_credential_path())


def _init_firebase() -> bool:
    global _firebase_app
    if _firebase_app is not None:
        return True
    cred_path = _resolve_credential_path()
    if not cred_path:
        return False
    try:
        import firebase_admin as fa
        from firebase_admin import credentials
        _firebase_app = fa.initialize_app(credentials.Certificate(cred_path))
        return True
    except Exception:
        return False


def verify_firebase_token(id_token: str) -> Optional[Dict[str, Any]]:
    if not _init_firebase():
        return None
    try:
        from firebase_admin import auth
        return auth.verify_id_token(id_token)
    except Exception:
        return None
