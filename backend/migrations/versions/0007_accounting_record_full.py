"""accounting_records: add full transaction fields

Revision ID: 0007_accounting_record_full
Revises: 0006_bot_pin
Create Date: 2026-05-17
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_accounting_record_full"
down_revision = "0006_bot_pin"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("accounting_records", sa.Column("txn_number",    sa.String(32),  nullable=True))
    op.add_column("accounting_records", sa.Column("employee_name", sa.String(255), nullable=True))
    op.add_column("accounting_records", sa.Column("client_phone",  sa.String(32),  nullable=True))
    op.add_column("accounting_records", sa.Column("goods",         sa.Text,        nullable=True))
    op.add_column("accounting_records", sa.Column("duration",      sa.String(64),  nullable=True))
    op.add_column("accounting_records", sa.Column("invoice_number",sa.String(128), nullable=True))


def downgrade() -> None:
    for col in ["txn_number", "employee_name", "client_phone", "goods", "duration", "invoice_number"]:
        op.drop_column("accounting_records", col)
