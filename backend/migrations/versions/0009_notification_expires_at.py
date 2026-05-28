"""notification_expires_at: add expires_at to notifications + call_missed support

Revision ID: 0009_notification_expires_at
Revises: 0008_email_invitations
Create Date: 2026-05-28
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_notification_expires_at"
down_revision = "0008_email_invitations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "expires_at")
