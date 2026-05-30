"""Tenant isolation helpers shared across all MCP servers."""
from __future__ import annotations

from .envelope import err, MCPEnvelope


class TenantViolation(Exception):
    pass


def assert_tenant_access(claimed_tenant_id: int, token_company_id: int | None, is_admin: bool = False) -> None:
    """Raise TenantViolation if the token's company does not match the requested tenant."""
    if is_admin:
        return
    if token_company_id is None:
        raise TenantViolation("Token has no company_id — cannot access tenant resources")
    if token_company_id != claimed_tenant_id:
        raise TenantViolation(
            f"Token company {token_company_id} cannot access tenant {claimed_tenant_id}"
        )


def tenant_err() -> MCPEnvelope:
    return err("Access denied: tenant isolation violation", "TENANT_VIOLATION")


def auth_err(detail: str = "Invalid or missing token") -> MCPEnvelope:
    return err(detail, "AUTH_ERROR")
