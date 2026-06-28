"""Align existing routes table with current Route model.

Revision ID: 20260628_0002
Revises: 20260628_0001
"""

from alembic import op

revision = "20260628_0002"
down_revision = "20260628_0001"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE routes
        ADD COLUMN IF NOT EXISTS truck_id INTEGER REFERENCES trucks(id),
        ADD COLUMN IF NOT EXISTS waypoints TEXT NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_routes_truck_id ON routes (truck_id);
    """)


def downgrade():
    op.execute("DROP INDEX IF EXISTS idx_routes_truck_id;")
    op.execute("ALTER TABLE routes DROP COLUMN IF EXISTS is_active;")
    op.execute("ALTER TABLE routes DROP COLUMN IF EXISTS waypoints;")
    op.execute("ALTER TABLE routes DROP COLUMN IF EXISTS truck_id;")
