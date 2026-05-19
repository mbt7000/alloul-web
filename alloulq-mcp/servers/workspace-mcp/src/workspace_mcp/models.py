"""New tables owned by workspace-mcp (not in the legacy backend)."""
from __future__ import annotations

import uuid as _uuid_mod

from sqlalchemy import (
    CheckConstraint, Column, Date, DateTime, ForeignKey,
    Index, Integer, SmallInteger, String, Text, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from workspace_mcp.database import Base


def _uuid() -> str:
    return str(_uuid_mod.uuid4())


# ─── CRM ─────────────────────────────────────────────────────────────────────

class Contact(Base):
    __tablename__ = "ws_contacts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    tenant_id = Column(Integer, nullable=False, index=True)         # = company_id
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(64), nullable=True)
    company = Column(String(255), nullable=True)
    stage = Column(
        String(32),
        CheckConstraint("stage IN ('lead','qualified','customer','lost')"),
        default="lead",
    )
    owner_user_id = Column(Integer, nullable=True)
    custom_fields = Column(JSONB, default=dict)
    search_vector = Column(Text, nullable=True)                      # tsvector stored as text
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    activities = relationship("CRMActivity", back_populates="contact", cascade="all, delete-orphan")
    __table_args__ = (
        Index("ix_ws_contacts_search", "search_vector", postgresql_using="gin",
              postgresql_ops={"search_vector": "tsvector_ops"}),
    )


class CRMActivity(Base):
    __tablename__ = "ws_crm_activities"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    tenant_id = Column(Integer, nullable=False, index=True)
    contact_id = Column(UUID(as_uuid=False), ForeignKey("ws_contacts.id", ondelete="SET NULL"), nullable=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id", ondelete="SET NULL"), nullable=True, index=True)
    type = Column(
        String(32),
        CheckConstraint("type IN ('call','email','meeting','note','whatsapp')"),
        nullable=False,
    )
    body = Column(Text, nullable=True)
    occurred_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, nullable=False)

    contact = relationship("Contact", back_populates="activities")


# ─── Handover items (SMB tier) ───────────────────────────────────────────────

class HandoverItem(Base):
    __tablename__ = "ws_handover_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    handover_id = Column(Integer, nullable=False, index=True)        # FK → legacy handovers.id
    tenant_id = Column(Integer, nullable=False, index=True)
    category = Column(String(128), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    attachments = Column(JSONB, default=list)
    status = Column(String(32), default="pending")
    position = Column(Integer, default=0)


# ─── Usage metering (shared with billing-mcp via DB) ─────────────────────────

class UsageRecord(Base):
    __tablename__ = "ws_usage_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    feature = Column(String(64), nullable=False)                     # ai_calls, meeting_minutes, etc.
    quantity = Column(Integer, default=1)
    period_start = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
