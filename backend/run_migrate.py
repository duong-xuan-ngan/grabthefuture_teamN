#!/usr/bin/env python3
"""
Run from backend/ with the venv active:
  python run_migrate.py

Or from anywhere using the venv python directly:
  .venv/bin/python run_migrate.py
"""
import os, sys

# Make sure we're in the backend directory so .env and alembic.ini are found
HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
sys.path.insert(0, HERE)

from dotenv import load_dotenv
load_dotenv(os.path.join(HERE, ".env"))

# ── 1. Run alembic migration ──────────────────────────────────────────────────
from alembic.config import Config
from alembic import command as alembic_command

print("==> alembic upgrade head")
cfg = Config(os.path.join(HERE, "alembic.ini"))
alembic_command.upgrade(cfg, "head")
print("    done\n")

# ── 2. Verify column exists ───────────────────────────────────────────────────
from app.database import engine
from sqlalchemy import inspect, text

print("==> Verifying users table...")
with engine.connect() as conn:
    cols = [c['name'] for c in inspect(engine).get_columns('users')]
    print(f"    columns: {cols}")
    if 'waste_point_id' in cols:
        print("    OK — waste_point_id column present\n")
    else:
        print("    FAIL — column missing, adding manually...")
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS waste_point_id INTEGER REFERENCES waste_points(id)"
        ))
        conn.commit()
        print("    Added manually\n")

# ── 3. Seed manager accounts ──────────────────────────────────────────────────
from sqlmodel import Session, select
from app.models import User, WastePoint
import bcrypt

MANAGERS = [
    {"username": "manager.benthanh", "waste_point_name": "Bến Thành Market Bin A"},
    {"username": "manager.buivien",  "waste_point_name": "Bùi Viện Food Street A"},
    {"username": "manager.taodан",   "waste_point_name": "Tao Đàn Park Bin A"},
    {"username": "manager.tanbinh",  "waste_point_name": "Chợ Tân Bình Bin A"},
]

print("==> Seeding manager accounts...")
demo_hash = bcrypt.hashpw(b"demo123", bcrypt.gensalt()).decode()
created = 0

with Session(engine) as s:
    for m in MANAGERS:
        # Skip if already exists
        if s.exec(select(User).where(User.username == m["username"])).first():
            print(f"    skip {m['username']} (already exists)")
            continue

        # Find waste point by name
        wp = s.exec(select(WastePoint).where(WastePoint.name == m["waste_point_name"])).first()
        if not wp:
            print(f"    WARN: waste point not found: {m['waste_point_name']}")
            continue

        user = User(
            username=m["username"],
            password=demo_hash,
            role="manager",
            truck_id=None,
            waste_point_id=wp.id,
        )
        s.add(user)
        created += 1
        print(f"    created {m['username']} → {wp.name} (id={wp.id})")

    s.commit()

print(f"\n    {created} manager accounts created")
print("\n==> All done!")
print("\nManager accounts (password: demo123):")
for m in MANAGERS:
    print(f"  {m['username']}")
