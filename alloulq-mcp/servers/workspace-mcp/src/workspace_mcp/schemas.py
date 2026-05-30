"""Pydantic schemas for workspace-mcp tool inputs/outputs."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


# ─── Auth context ────────────────────────────────────────────────────────────

class AuthCtx(BaseModel):
    token: str = Field(description="JWT Bearer token from the ALLOUL&Q backend")


# ─── CRM ─────────────────────────────────────────────────────────────────────

class ContactOut(BaseModel):
    id: str
    tenant_id: int
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    stage: str
    owner_user_id: Optional[int]
    custom_fields: dict[str, Any]
    created_at: Optional[str]


class DealOut(BaseModel):
    id: int
    tenant_id: int
    title: str
    value: int
    currency: str
    stage: str
    probability: int
    expected_close: Optional[str]
    owner_user_id: Optional[int]
    contact_name: Optional[str]
    created_at: Optional[str]


class ActivityOut(BaseModel):
    id: str
    type: str
    body: Optional[str]
    occurred_at: str
    created_by: int


# ─── Tasks ───────────────────────────────────────────────────────────────────

class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    assignee_id: Optional[int]
    due_date: Optional[str]
    project_id: Optional[int]
    created_by: Optional[int]
    created_at: Optional[str]


class ProjectOut(BaseModel):
    id: int
    name: str
    status: str
    lead_user_id: Optional[int]
    start_date: Optional[str]
    target_date: Optional[str]


# ─── Meetings ────────────────────────────────────────────────────────────────

class MeetingOut(BaseModel):
    id: int
    title: str
    room_url: Optional[str]
    provider: str
    starts_at: Optional[str]
    ends_at: Optional[str]
    organizer_id: int
    status: str
    recording_url: Optional[str]
    transcript_url: Optional[str]
    ai_summary: Optional[str]


# ─── Handover ────────────────────────────────────────────────────────────────

class HandoverOut(BaseModel):
    id: int
    title: str
    from_user_id: int
    to_user_id: Optional[int]
    status: str
    due_date: Optional[str]
    items: list[dict[str, Any]]
    created_at: Optional[str]


# ─── Search ──────────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    type: str           # contact | deal | task | handover | meeting
    id: str
    title: str
    snippet: str
    score: float
    permalink: str
