"""Meeting tools — schedule, list, cancel, attach summary."""
from __future__ import annotations

import os
from typing import Any, Optional

from mcp_core import ok, err, verify_jwt, MCPAuthError, write_audit
from mcp_core.tenant import assert_tenant_access, TenantViolation, tenant_err, auth_err
from mcp_core import legacy_client as lc

from workspace_mcp.integrations.dailyco import create_room, delete_room


async def meetings_schedule(
    token: str,
    tenant_id: int,
    title: str,
    starts_at: str,
    ends_at: str,
    attendee_ids: Optional[list[int]] = None,
    description: Optional[str] = None,
    project_id: Optional[int] = None,
) -> dict[str, Any]:
    """Create a meeting with a Daily.co room, store in legacy backend."""
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    # Parse starts_at to extract date/time for legacy backend
    from datetime import datetime
    try:
        start_dt = datetime.fromisoformat(starts_at)
        meeting_date = start_dt.date().isoformat()
        meeting_time = start_dt.strftime("%H:%M")
    except ValueError:
        return err("starts_at must be ISO 8601 format", "VALIDATION_ERROR")

    try:
        end_dt = datetime.fromisoformat(ends_at)
        duration_minutes = max(1, int((end_dt - start_dt).total_seconds() / 60))
    except ValueError:
        duration_minutes = 60

    # Create legacy meeting record first to get an ID
    try:
        meeting = await lc.post(
            "/meetings/",
            user_token=token,
            body={
                "title": title,
                "description": description,
                "meeting_date": meeting_date,
                "meeting_time": meeting_time,
                "duration_minutes": duration_minutes,
                "location": "Daily",
                "project_id": project_id,
                "attendee_ids": attendee_ids or [],
            },
        )
    except Exception as exc:
        return err(f"Backend error creating meeting: {exc}", "BACKEND_ERROR")

    meeting_id = meeting.get("id", 0)

    # Create Daily.co room
    try:
        room = await create_room(meeting_id, exp_minutes=duration_minutes + 30)
        room_url = room["url"]
    except Exception as exc:
        room_url = None

    # Patch meeting with room URL
    if room_url:
        try:
            await lc.patch(
                f"/meetings/{meeting_id}",
                user_token=token,
                body={"location": room_url},
            )
        except Exception:
            pass

    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8000")
    service_token = os.environ.get("BACKEND_SERVICE_TOKEN", "")
    await write_audit(
        backend_url=backend_url,
        service_token=service_token,
        company_id=tenant_id,
        user_id=claims.user_id,
        action="meetings.meeting.scheduled",
        resource_type="meeting",
        resource_id=meeting_id,
        payload={"title": title, "starts_at": starts_at},
    )
    return ok({**meeting, "room_url": room_url, "provider": "dailyco"})


async def meetings_list_upcoming(
    token: str,
    tenant_id: int,
    limit: int = 20,
) -> dict[str, Any]:
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    try:
        meetings = await lc.get("/meetings/", user_token=token, limit=limit)
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")
    return ok(meetings)


async def meetings_cancel(
    token: str,
    tenant_id: int,
    meeting_id: int,
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
            f"/meetings/{meeting_id}",
            user_token=token,
            body={"status": "cancelled"},
        )
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")

    # Best-effort room cleanup
    room_name = f"alloulq-{meeting_id}"
    try:
        await delete_room(room_name)
    except Exception:
        pass

    return ok(result)


async def meetings_attach_summary(
    token: str,
    tenant_id: int,
    meeting_id: int,
    ai_summary: str,
    recording_url: Optional[str] = None,
    transcript_url: Optional[str] = None,
    action_items: Optional[str] = None,
) -> dict[str, Any]:
    """Called by the AI Assistant after a meeting ends to attach the summary."""
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    patch_body: dict[str, Any] = {"notes": ai_summary, "status": "done"}
    if action_items:
        patch_body["action_items"] = action_items

    try:
        result = await lc.patch(
            f"/meetings/{meeting_id}",
            user_token=token,
            body=patch_body,
        )
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")

    return ok({**result, "ai_summary": ai_summary, "recording_url": recording_url, "transcript_url": transcript_url})
