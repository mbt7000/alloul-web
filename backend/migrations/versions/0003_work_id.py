"""Add work_id to company_members

Revision ID: 0003_work_id
Revises: 0002_rls_multi_tenant
Create Date: 2026-04-16

Adds a globally-unique employee Work ID column (EMP-YYYY-NNNN-XXXX)
to company_members. Existing rows get a work_id generated on first
access; new rows get one at insert time.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003_work_id"
down_revision: Union[str, None] = "0002_rls_multi_tenant"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "company_members",
        sa.Column("work_id", sa.String(24), unique=True, nullable=True),
    )
    op.create_index("ix_company_members_work_id", "company_members", ["work_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_company_members_work_id", table_name="company_members")
    op.drop_column("company_members", "work_id")
