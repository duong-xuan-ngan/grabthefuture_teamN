"""Bridge existing Supabase revision into the local migration graph.

Revision ID: 20260628_0001
Revises: 0004
"""

revision = "20260628_0001"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    # The shared Supabase database was already stamped with this revision.
    # Keep this migration as a no-op so Alembic can continue from that point.
    pass


def downgrade():
    pass
