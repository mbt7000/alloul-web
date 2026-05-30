"""add bot_pin_hash to accounting_permissions

Revision ID: 0006_bot_pin
Revises: 0005_telegram_chat_id
Create Date: 2026-05-15
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_bot_pin"
down_revision = "0005_telegram_chat_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "accounting_permissions",
        sa.Column("bot_pin_hash", sa.String(128), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("accounting_permissions", "bot_pin_hash")
