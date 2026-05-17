"""users: add email_verified column

Revision ID: 0008_email_verified
Revises: 0007_accounting_record_full
Create Date: 2026-05-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_email_verified"
down_revision = "0007_accounting_record_full"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add column — existing users get True (already in system, no need to re-verify)
    op.add_column(
        "users",
        sa.Column(
            "email_verified",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
    )
    # New registrations default to False (set in application layer)


def downgrade() -> None:
    op.drop_column("users", "email_verified")
