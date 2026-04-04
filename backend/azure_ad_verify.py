"""
Validate Azure AD / Microsoft Entra id_token (JWT).
Uses JWKS for the tenant that signed the token (tid claim) so /common and
single-tenant apps both work.
"""
from __future__ import annotations

import json
import urllib.request
from typing import Any, Dict, Optional

from jose import JWTError, jwt, jwk


def _get_jwks_uri(tenant_id: str) -> str:
    return f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"


def _fetch_jwks(tenant_id: str) -> dict:
    url = _get_jwks_uri(tenant_id)
    with urllib.request.urlopen(url, timeout=10) as resp:
        return json.loads(resp.read().decode())


def verify_azure_ad_token(
    id_token: str,
    client_id: str,
    tenant_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Validate Azure AD id_token. Returns decoded claims or None.
    JWKS and issuer are taken from the token's `tid` / `iss` so multi-tenant
    (authority common/organizations) works when the app registration allows it.
    """
    del tenant_id  # reserved for future policy; verification uses tid from token
    try:
        claims_preview = jwt.get_unverified_claims(id_token)
    except JWTError:
        return None
    tid = claims_preview.get("tid")
    iss = claims_preview.get("iss")
    if not tid or not iss:
        return None
    try:
        jwks = _fetch_jwks(tid)
        unverified = jwt.get_unverified_header(id_token)
        kid = unverified.get("kid")
        key_dict = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key_dict:
            return None
        key = jwk.construct(key_dict)
        claims = jwt.decode(
            id_token,
            key,
            algorithms=["RS256"],
            audience=client_id,
            issuer=iss,
            options={"verify_aud": True, "verify_iss": True, "verify_exp": True},
        )
        return claims
    except (JWTError, Exception):
        return None
