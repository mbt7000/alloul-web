"""add telegram_chat_id to users

Revision ID: 0005_telegram_chat_id
Revises: 0004_employee_no
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_telegram_chat_id"
down_revision = "0004_employee_no"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("telegram_chat_id", sa.String(32), nullable=True),
    )
    op.create_index(
        "ix_users_telegram_chat_id",
        "users",
        ["telegram_chat_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_users_telegram_chat_id", table_name="users")
    op.drop_column("users", "telegram_chat_id")
