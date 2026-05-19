"""CRM tools: contacts, deals, activities, timeline."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Optional

from mcp_core import ok, err, verify_jwt, MCPAuthError, write_audit
from mcp_core.tenant import assert_tenant_access, TenantViolation, tenant_err, auth_err
from mcp_core import legacy_client as lc

from workspace_mcp.database import get_session
from workspace_mcp.models import Contact, CRMActivity


def _serialize_contact(c: Contact) -> dict[str, Any]:
    return {
        "id": c.id,
        "tenant_id": c.tenant_id,
        "full_name": c.full_name,
        "email": c.email,
        "phone": c.phone,
        "company": c.company,
        "stage": c.stage,
        "owner_user_id": c.owner_user_id,
        "custom_fields": c.custom_fields or {},
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _serialize_activity(a: CRMActivity) -> dict[str, Any]:
    return {
        "id": a.id,
        "type": a.type,
        "body": a.body,
        "occurred_at": a.occurred_at.isoformat() if a.occurred_at else None,
        "created_by": a.created_by,
        "contact_id": a.contact_id,
        "deal_id": a.deal_id,
    }


async def crm_create_contact(
    token: str,
    tenant_id: int,
    full_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    company: Optional[str] = None,
    stage: str = "lead",
    owner_user_id: Optional[int] = None,
    custom_fields: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    if stage not in ("lead", "qualified", "customer", "lost"):
        return err(f"Invalid stage '{stage}'", "VALIDATION_ERROR")

    with get_session() as db:
        contact = Contact(
            tenant_id=tenant_id,
            full_name=full_name,
            email=email,
            phone=phone,
            company=company,
            stage=stage,
            owner_user_id=owner_user_id or claims.user_id,
            custom_fields=custom_fields or {},
        )
        db.add(contact)
        db.flush()
        result = _serialize_contact(contact)

    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8000")
    service_token = os.environ.get("BACKEND_SERVICE_TOKEN", "")
    await write_audit(
        backend_url=backend_url,
        service_token=service_token,
        company_id=tenant_id,
        user_id=claims.user_id,
        action="crm.contact.created",
        resource_type="contact",
        resource_id=None,
        payload={"contact_id": result["id"], "full_name": full_name},
    )
    return ok(result)


async def crm_update_contact(
    token: str,
    tenant_id: int,
    contact_id: str,
    full_name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    company: Optional[str] = None,
    stage: Optional[str] = None,
    owner_user_id: Optional[int] = None,
    custom_fields: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    if stage and stage not in ("lead", "qualified", "customer", "lost"):
        return err(f"Invalid stage '{stage}'", "VALIDATION_ERROR")

    with get_session() as db:
        contact = db.query(Contact).filter(
            Contact.id == contact_id, Contact.tenant_id == tenant_id
        ).first()
        if not contact:
            return err("Contact not found", "NOT_FOUND")
        if full_name is not None:
            contact.full_name = full_name
        if email is not None:
            contact.email = email
        if phone is not None:
            contact.phone = phone
        if company is not None:
            contact.company = company
        if stage is not None:
            contact.stage = stage
        if owner_user_id is not None:
            contact.owner_user_id = owner_user_id
        if custom_fields is not None:
            contact.custom_fields = custom_fields
        result = _serialize_contact(contact)
    return ok(result)


async def crm_list_contacts(
    token: str,
    tenant_id: int,
    stage: Optional[str] = None,
    owner_user_id: Optional[int] = None,
    search: Optional[str] = None,
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

    with get_session() as db:
        q = db.query(Contact).filter(Contact.tenant_id == tenant_id)
        if stage:
            q = q.filter(Contact.stage == stage)
        if owner_user_id:
            q = q.filter(Contact.owner_user_id == owner_user_id)
        if search:
            pattern = f"%{search}%"
            q = q.filter(
                Contact.full_name.ilike(pattern) |
                Contact.email.ilike(pattern) |
                Contact.company.ilike(pattern)
            )
        total = q.count()
        contacts = q.order_by(Contact.created_at.desc()).offset(offset).limit(limit).all()
        items = [_serialize_contact(c) for c in contacts]
    return ok({"items": items, "total": total, "offset": offset, "limit": limit})


async def crm_create_deal(
    token: str,
    tenant_id: int,
    title: str,
    value: int = 0,
    currency: str = "SAR",
    stage: str = "lead",
    probability: int = 0,
    expected_close: Optional[str] = None,
    contact_name: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict[str, Any]:
    """Create a deal via the legacy backend's /deals endpoint."""
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    try:
        result = await lc.post(
            "/deals/",
            user_token=token,
            body={
                "company": title,
                "value": value,
                "stage": stage,
                "probability": probability,
                "contact": contact_name,
                "notes": notes,
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
        action="crm.deal.created",
        resource_type="deal",
        resource_id=result.get("id"),
        payload={"title": title, "value": value, "stage": stage},
    )
    return ok(result)


async def crm_move_deal_stage(
    token: str,
    tenant_id: int,
    deal_id: int,
    new_stage: str,
) -> dict[str, Any]:
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    valid_stages = ("lead", "qualified", "proposal", "negotiation", "won", "lost")
    if new_stage not in valid_stages:
        return err(f"Invalid stage. Must be one of: {', '.join(valid_stages)}", "VALIDATION_ERROR")

    try:
        result = await lc.patch(
            f"/deals/{deal_id}",
            user_token=token,
            body={"stage": new_stage},
        )
    except Exception as exc:
        return err(f"Backend error: {exc}", "BACKEND_ERROR")
    return ok(result)


async def crm_log_activity(
    token: str,
    tenant_id: int,
    activity_type: str,
    body: str,
    contact_id: Optional[str] = None,
    deal_id: Optional[int] = None,
    occurred_at: Optional[str] = None,
) -> dict[str, Any]:
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    valid_types = ("call", "email", "meeting", "note", "whatsapp")
    if activity_type not in valid_types:
        return err(f"Invalid type. Must be one of: {', '.join(valid_types)}", "VALIDATION_ERROR")

    ts = None
    if occurred_at:
        try:
            ts = datetime.fromisoformat(occurred_at)
        except ValueError:
            return err("occurred_at must be ISO 8601 format", "VALIDATION_ERROR")

    with get_session() as db:
        activity = CRMActivity(
            tenant_id=tenant_id,
            contact_id=contact_id,
            deal_id=deal_id,
            type=activity_type,
            body=body,
            occurred_at=ts or datetime.now(timezone.utc),
            created_by=claims.user_id,
        )
        db.add(activity)
        db.flush()
        result = _serialize_activity(activity)
    return ok(result)


async def crm_contact_timeline(
    token: str,
    tenant_id: int,
    contact_id: str,
    limit: int = 50,
) -> dict[str, Any]:
    """Return merged activities + deals + tasks for a contact."""
    try:
        claims = verify_jwt(token)
        assert_tenant_access(tenant_id, claims.company_id, claims.is_admin)
    except MCPAuthError as e:
        return auth_err(str(e))
    except TenantViolation:
        return tenant_err()

    with get_session() as db:
        contact = db.query(Contact).filter(
            Contact.id == contact_id, Contact.tenant_id == tenant_id
        ).first()
        if not contact:
            return err("Contact not found", "NOT_FOUND")

        activities = (
            db.query(CRMActivity)
            .filter(CRMActivity.contact_id == contact_id, CRMActivity.tenant_id == tenant_id)
            .order_by(CRMActivity.occurred_at.desc())
            .limit(limit)
            .all()
        )
        timeline = [_serialize_activity(a) for a in activities]

    # Fetch deals from legacy backend where contact name matches
    try:
        deals_resp = await lc.get("/deals/", user_token=token)
        deals = [
            d for d in (deals_resp if isinstance(deals_resp, list) else [])
            if d.get("contact") and contact.full_name.lower() in d["contact"].lower()
        ]
    except Exception:
        deals = []

    return ok({
        "contact": _serialize_contact(contact),
        "activities": timeline,
        "deals": deals[:limit],
    })
