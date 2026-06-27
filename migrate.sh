#!/usr/bin/env bash
# Run from project root: bash migrate.sh
# Activates the backend venv and runs alembic upgrade head.

set -e
cd "$(dirname "$0")/backend"

PYTHON="$(pwd)/.venv/bin/python3"
ALEMBIC="$(pwd)/.venv/bin/alembic"

if [ ! -f "$PYTHON" ]; then
  echo "ERROR: venv not found at $PYTHON"
  echo "Run: cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

echo "==> Running: alembic upgrade head"
"$PYTHON" -m alembic upgrade head
echo "==> Migration done"

echo ""
echo "==> Checking users table columns..."
"$PYTHON" - <<'EOF'
import os; os.chdir(os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else '.')
from dotenv import load_dotenv; load_dotenv('.env')
from app.database import engine
from sqlalchemy import inspect
cols = [c['name'] for c in inspect(engine).get_columns('users')]
print("  users columns:", cols)
if 'waste_point_id' in cols:
    print("  OK — waste_point_id exists")
else:
    print("  WARNING — waste_point_id missing, migration may have failed")
EOF
