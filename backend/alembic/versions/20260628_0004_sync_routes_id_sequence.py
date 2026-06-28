"""Sync routes id sequence after legacy data.

Revision ID: 20260628_0004
Revises: 20260628_0003
"""

from alembic import op

revision = "20260628_0004"
down_revision = "20260628_0003"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        SELECT setval(
            pg_get_serial_sequence('routes', 'id'),
            COALESCE((SELECT MAX(id) FROM routes), 1),
            TRUE
        );
    """)


def downgrade():
    pass
