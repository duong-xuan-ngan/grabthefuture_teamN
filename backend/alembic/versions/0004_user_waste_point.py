"""Add waste_point_id to users for manager role.

Revision ID: 0004
"""
from alembic import op

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS waste_point_id INTEGER REFERENCES waste_points(id);
    """)


def downgrade():
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS waste_point_id;")
