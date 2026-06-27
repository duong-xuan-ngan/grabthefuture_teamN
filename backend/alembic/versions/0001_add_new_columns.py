"""Add new columns: WastePoint.status, Task.scenario_id+action,
Report.source+estimated_volume_kg+deadline, RouteSegment table,
Zone table.

Revision ID: 0001
"""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ── waste_points: add status column ──────────────────────────────────────
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'wastepointstatus'
            ) THEN
                CREATE TYPE wastepointstatus AS ENUM
                    ('normal', 'near_full', 'full', 'overflow');
            END IF;
        END $$;
    """)
    op.execute("""
        ALTER TABLE waste_points
        ADD COLUMN IF NOT EXISTS status wastepointstatus NOT NULL DEFAULT 'normal';
    """)

    # ── tasks: add scenario_id and action ────────────────────────────────────
    op.execute("""
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS scenario_id VARCHAR,
        ADD COLUMN IF NOT EXISTS action      VARCHAR;
    """)

    # ── reports: add source, estimated_volume_kg, deadline ──────────────────
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'wasteeventsource'
            ) THEN
                CREATE TYPE wasteeventsource AS ENUM
                    ('resident', 'driver', 'business', 'emergency', 'sensor');
            END IF;
        END $$;
    """)
    op.execute("""
        ALTER TABLE reports
        ALTER COLUMN waste_point_id DROP NOT NULL;
    """)
    op.execute("""
        ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS source              wasteeventsource NOT NULL DEFAULT 'resident',
        ADD COLUMN IF NOT EXISTS estimated_volume_kg FLOAT,
        ADD COLUMN IF NOT EXISTS deadline            TIMESTAMP;
    """)

    # ── hotspots: make waste_point_id nullable (ad-hoc hotspots) ─────────────
    op.execute("""
        ALTER TABLE hotspots
        ALTER COLUMN waste_point_id DROP NOT NULL;
    """)

    # ── route_segments: new table ─────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS route_segments (
            id          SERIAL PRIMARY KEY,
            truck_id    INTEGER NOT NULL REFERENCES trucks(id),
            task_id     INTEGER REFERENCES tasks(id),
            seq_order   INTEGER NOT NULL DEFAULT 0,
            h3_cells    TEXT    NOT NULL DEFAULT '[]',
            start_lat   FLOAT   NOT NULL DEFAULT 0.0,
            start_lng   FLOAT   NOT NULL DEFAULT 0.0,
            end_lat     FLOAT   NOT NULL DEFAULT 0.0,
            end_lng     FLOAT   NOT NULL DEFAULT 0.0,
            created_at  TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_route_segments_truck_id
            ON route_segments (truck_id);
    """)

    # ── zones: new table (zone-based driver assignment) ───────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS zones (
            id          SERIAL PRIMARY KEY,
            name        VARCHAR NOT NULL,
            color       VARCHAR NOT NULL DEFAULT '#00B14F',
            h3_cells    TEXT    NOT NULL DEFAULT '[]',
            truck_id    INTEGER REFERENCES trucks(id),
            status      VARCHAR NOT NULL DEFAULT 'normal',
            created_at  TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS zones;")
    op.execute("DROP TABLE IF EXISTS route_segments;")
    op.execute("ALTER TABLE reports DROP COLUMN IF EXISTS deadline;")
    op.execute("ALTER TABLE reports DROP COLUMN IF EXISTS estimated_volume_kg;")
    op.execute("ALTER TABLE reports DROP COLUMN IF EXISTS source;")
    op.execute("ALTER TABLE tasks DROP COLUMN IF EXISTS action;")
    op.execute("ALTER TABLE tasks DROP COLUMN IF EXISTS scenario_id;")
    op.execute("ALTER TABLE waste_points DROP COLUMN IF EXISTS status;")
