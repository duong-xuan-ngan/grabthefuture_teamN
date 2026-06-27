"""Add routes table (truck fixed routes).

Revision ID: 0002
"""
from alembic import op

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS routes (
            id          SERIAL PRIMARY KEY,
            truck_id    INTEGER NOT NULL REFERENCES trucks(id),
            name        VARCHAR NOT NULL,
            waypoints   TEXT    NOT NULL DEFAULT '[]',
            is_active   BOOLEAN NOT NULL DEFAULT TRUE,
            created_at  TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_routes_truck_id ON routes (truck_id);
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS routes;")
