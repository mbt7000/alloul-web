"""Write mutations to audit_log via the legacy backend's ActivityLog table."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)


async def write_audit(
    *,
    backend_url: str,
    service_token: str,
    company_id: int,
    user_id: int,
    action: str,
    resource_type: str,
    resource_id: Optional[int],
    payload: Optional[dict[str, Any]] = None,
) -> None:
    """Fire-and-forget audit write. Never raises — audit failure must not break tools."""
    body = {
        "company_id": company_id,
        "user_id": user_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "payload": json.dumps(payload or {}),
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{backend_url}/internal/audit",
                json=body,
                headers={"Authorization": f"Bearer {service_token}"},
            )
    except Exception as exc:
        logger.warning("audit write failed: %s", exc)
