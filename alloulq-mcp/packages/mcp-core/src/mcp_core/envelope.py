"""Standard {ok, data, error} response envelope for all MCP tools."""
from __future__ import annotations

from typing import Any, Optional


MCPEnvelope = dict[str, Any]


def ok(data: Any) -> MCPEnvelope:
    return {"ok": True, "data": data, "error": None}


def err(message: str, code: str = "ERROR") -> MCPEnvelope:
    return {"ok": False, "data": None, "error": {"code": code, "message": message}}
