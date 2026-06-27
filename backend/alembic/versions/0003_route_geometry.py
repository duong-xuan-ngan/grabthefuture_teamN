"""Add geometry column to routes (road-snapped path).

Revision ID: 0003
"""
from alembic import op

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE routes
        ADD COLUMN IF NOT EXISTS geometry TEXT NOT NULL DEFAULT '[]';
    """)


def downgrade():
    op.execute("ALTER TABLE routes DROP COLUMN IF EXISTS geometry;")
