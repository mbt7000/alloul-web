"""Team tools — thin wrapper over identity-mcp / legacy backend."""
from __future__ import annotations

from typing import Any, Optional

from mcp_core import ok, err, verify_jwt, MCPAuthError
from mcp_core.tenant import assert_tenant_access, TenantViolation, tenant_err, auth_err
from mcp_core import legacy_client as lc


async def team_list_members(
    token: str,
    tenant_id: int,
    include_inactive: bool = False,
) -> dict[str, Any]:
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    try:
        members = await lc.get("/companies/members", user_token=token)
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")
    return ok(members)


async def team_workload(
    token: str,
    tenant_id: int,
    user_ids: Optional[list[int]] = None,
) -> dict[str, Any]:
    """Per-member: open tasks, upcoming meetings."""
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    try:
        members_resp = await lc.get("/companies/members", user_token=token)
        members = members_resp if isinstance(members_resp, list) else (members_resp.get("members", []) if isinstance(members_resp, dict) else [])
        projects = await lc.get("/projects/", user_token=token)
        if not isinstance(projects, list):
            projects = []
        meetings_resp = await lc.get("/meetings/", user_token=token)
        meetings = meetings_resp if isinstance(meetings_resp, list) else []
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")

    # Build workload per member
    workload = []
    for m in members:
        uid = m.get("user_id") or m.get("id")
        if user_ids and uid not in user_ids:
            continue

        open_tasks: list[dict] = []
        for proj in projects:
            pid = proj.get("id")
            if pid:
                try:
                    tasks_resp = await lc.get(f"/projects/{pid}/tasks", user_token=token)
                    if isinstance(tasks_resp, list):
                        for t in tasks_resp:
                            if t.get("assignee_id") == uid and t.get("status") not in ("done", "cancelled"):
                                open_tasks.append(t)
                except Exception:
                    pass

        upcoming = [
            mg for mg in meetings
            if isinstance(mg.get("attendees"), list) and uid in mg["attendees"]
        ]

        workload.append({
            "user_id": uid,
            "name": m.get("name") or m.get("username", ""),
            "open_tasks": len(open_tasks),
            "upcoming_meetings": len(upcoming),
            "tasks": open_tasks[:10],
        })

    return ok(workload)
