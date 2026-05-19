"""JWT verification — uses same SECRET_KEY as the legacy FastAPI backend."""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

from jose import JWTError, jwt


class MCPAuthError(Exception):
    pass


@dataclass
class MCPClaims:
    user_id: int
    company_id: Optional[int]
    email: str
    is_admin: bool = False


def verify_jwt(token: str) -> MCPClaims:
    """Decode and verify a JWT produced by the legacy backend."""
    secret = os.environ.get("SECRET_KEY", "change-me-in-production-use-openssl-rand-hex-32")
    algorithm = os.environ.get("ALGORITHM", "HS256")
    try:
        payload = jwt.decode(token, secret, algorithms=[algorithm])
    except JWTError as exc:
        raise MCPAuthError(f"Invalid token: {exc}") from exc

    user_id = payload.get("sub") or payload.get("user_id")
    if user_id is None:
        raise MCPAuthError("Token missing sub/user_id")

    return MCPClaims(
        user_id=int(user_id),
        company_id=payload.get("company_id"),
        email=payload.get("email", ""),
        is_admin=bool(payload.get("is_admin", False)),
    )
