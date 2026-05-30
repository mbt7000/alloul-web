"""Task and project tools — proxy to legacy backend."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from mcp_core import ok, err, verify_jwt, MCPAuthError, write_audit
from mcp_core.tenant import assert_tenant_access, TenantViolation, tenant_err, auth_err
from mcp_core import legacy_client as lc
import os


async def tasks_create(
    token: str,
    tenant_id: int,
    title: str,
    project_id: Optional[int] = None,
    description: Optional[str] = None,
    status: str = "todo",
    priority: str = "normal",
    assignee_id: Optional[int] = None,
    due_date: Optional[str] = None,
) -> dict[str, Any]:
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    if status not in ("todo", "in_progress", "blocked", "done", "cancelled"):
        return err(f"Invalid status '{status}'", "VALIDATION_ERROR")
    if priority not in ("low", "normal", "high", "urgent"):
        return err(f"Invalid priority '{priority}'", "VALIDATION_ERROR")

    # Map 'normal' → 'medium' for legacy backend
    legacy_priority = "medium" if priority == "normal" else priority

    try:
        if project_id:
            result = await lc.post(
                f"/projects/{project_id}/tasks",
                user_token=token,
                body={
                    "title": title,
                    "description": description,
                    "status": status if status not in ("blocked", "cancelled") else "todo",
                    "priority": legacy_priority,
                    "assignee_id": assignee_id,
                    "due_date": due_date,
                },
            )
        else:
            # Create a standalone task-note via memory endpoint
            result = await lc.post(
                "/memories/",
                user_token=token,
                body={
                    "title": title,
                    "description": description or "",
                    "type": "task",
                    "importance": legacy_priority,
                },
            )
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")

    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8000")
    service_token = os.environ.get("BACKEND_SERVICE_TOKEN", "")
    await write_audit(
        backend_url=backend_url,
        service_token=service_token,
        company_id=tenant_id,
        user_id=claims.user_id,
        action="tasks.task.created",
        resource_type="task",
        resource_id=result.get("id"),
        payload={"title": title, "project_id": project_id},
    )
    return ok(result)


async def tasks_update_status(
    token: str,
    tenant_id: int,
    task_id: int,
    project_id: int,
    new_status: str,
) -> dict[str, Any]:
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    valid = ("todo", "in_progress", "done")
    if new_status not in valid:
        return err(f"Status must be one of: {', '.join(valid)}", "VALIDATION_ERROR")

    try:
        result = await lc.patch(
            f"/projects/{project_id}/tasks/{task_id}",
            user_token=token,
            body={"status": new_status},
        )
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")
    return ok(result)


async def tasks_assign(
    token: str,
    tenant_id: int,
    task_id: int,
    project_id: int,
    assignee_id: int,
) -> dict[str, Any]:
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    try:
        result = await lc.patch(
            f"/projects/{project_id}/tasks/{task_id}",
            user_token=token,
            body={"assignee_id": assignee_id},
        )
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")
    return ok(result)


async def tasks_list(
    token: str,
    tenant_id: int,
    assignee_id: Optional[int] = None,
    status: Optional[str] = None,
    project_id: Optional[int] = None,
    due_from: Optional[str] = None,
    due_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    params: dict[str, Any] = {}
    if project_id:
        params["project_id"] = project_id
    if status:
        params["status"] = status

    try:
        if project_id:
            result = await lc.get(f"/projects/{project_id}/tasks", user_token=token, **params)
        else:
            result = await lc.get("/projects/", user_token=token)
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")
    return ok(result)


async def tasks_my_today(
    token: str,
    tenant_id: int,
) -> dict[str, Any]:
    """Return the caller's tasks due today and overdue."""
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    today = date.today().isoformat()
    try:
        projects = await lc.get("/projects/", user_token=token)
        if not isinstance(projects, list):
            projects = []

        today_tasks = []
        for proj in projects:
            pid = proj.get("id")
            if not pid:
                continue
            try:
                tasks_resp = await lc.get(f"/projects/{pid}/tasks", user_token=token)
                if not isinstance(tasks_resp, list):
                    continue
                for t in tasks_resp:
                    due = t.get("due_date")
                    assignee = t.get("assignee_id")
                    if assignee == claims.user_id and t.get("status") not in ("done", "cancelled"):
                        if due and due <= today:
                            today_tasks.append({**t, "project_id": pid})
            except Exception:
                continue
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")

    return ok({"tasks": today_tasks, "count": len(today_tasks), "as_of": today})


async def projects_create(
    token: str,
    tenant_id: int,
    name: str,
    description: Optional[str] = None,
    status: str = "planning",
    start_date: Optional[str] = None,
    target_date: Optional[str] = None,
) -> dict[str, Any]:
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    try:
        result = await lc.post(
            "/projects/",
            user_token=token,
            body={
                "name": name,
                "description": description,
                "status": status,
                "due_date": target_date,
            },
        )
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")
    return ok(result)


async def projects_summary(
    token: str,
    tenant_id: int,
    project_id: int,
) -> dict[str, Any]:
    """Return project status, % complete, and blockers."""
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    try:
        project = await lc.get(f"/projects/{project_id}", user_token=token)
        tasks_resp = await lc.get(f"/projects/{project_id}/tasks", user_token=token)
        tasks = tasks_resp if isinstance(tasks_resp, list) else []
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")

    total = len(tasks)
    done = sum(1 for t in tasks if t.get("status") == "done")
    blocked = [t for t in tasks if t.get("status") == "blocked"]
    pct = round(done / total * 100) if total > 0 else 0

    return ok({
        "project": project,
        "total_tasks": total,
        "done_tasks": done,
        "percent_complete": pct,
        "blockers": blocked,
    })
