"""email_invitations: token-based email invite system

Revision ID: 0008_email_invitations
Revises: 0007_accounting_record_full
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_email_invitations"
down_revision = "0007_accounting_record_full"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_invitations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("inviter_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, index=True),
        sa.Column("role", sa.String(32), nullable=False, server_default="member"),
        sa.Column("token", sa.String(128), nullable=False, unique=True, index=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("email_invitations")
