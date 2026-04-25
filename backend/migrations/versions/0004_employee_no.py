"""Add employee_no to users

Revision ID: 0004_employee_no
Revises: 0003_work_id
Create Date: 2026-04-25

Adds a short unique employee number (10001+) to every user.
Visible in profile, used for Shukra bot authentication.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = "0004_employee_no"
down_revision: Union[str, None] = "0003_work_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add column without unique constraint (SQLite doesn't support ALTER COLUMN constraints)
    op.add_column(
        "users",
        sa.Column("employee_no", sa.String(8), nullable=True),
    )
    # Create unique index separately
    op.create_index("ix_users_employee_no", "users", ["employee_no"], unique=True)

    # Backfill existing users: assign sequential numbers starting at 10001
    conn = op.get_bind()
    users = conn.execute(text("SELECT id FROM users ORDER BY id")).fetchall()
    for idx, (uid,) in enumerate(users):
        emp_no = str(10001 + idx)
        conn.execute(
            text("UPDATE users SET employee_no = :no WHERE id = :id"),
            {"no": emp_no, "id": uid},
        )


def downgrade() -> None:
    op.drop_index("ix_users_employee_no", table_name="users")
    op.drop_column("users", "employee_no")
