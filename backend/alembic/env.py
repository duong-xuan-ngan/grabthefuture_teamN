import os
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import create_engine, pool
from alembic import context
from dotenv import load_dotenv

# Load .env from backend/ first, then fall back to project root
_backend_dir = Path(__file__).resolve().parents[1]
load_dotenv(_backend_dir / ".env")                          # backend/.env (if present)
load_dotenv(_backend_dir.parent / ".env", override=False)   # project-root .env

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.models import SQLModel  # noqa: F401 — registers all table metadata
target_metadata = SQLModel.metadata

DB_URL = os.environ["DATABASE_URL"]


def run_migrations_offline():
    context.configure(url=DB_URL, target_metadata=target_metadata, literal_binds=True,
                      dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = create_engine(
        DB_URL,
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
