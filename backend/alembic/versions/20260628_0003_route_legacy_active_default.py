"""Set default for legacy routes.active column.

Revision ID: 20260628_0003
Revises: 20260628_0002
"""

from alembic import op

revision = "20260628_0003"
down_revision = "20260628_0002"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE routes
        ALTER COLUMN active SET DEFAULT TRUE;
    """)


def downgrade():
    op.execute("""
        ALTER TABLE routes
        ALTER COLUMN active DROP DEFAULT;
    """)
