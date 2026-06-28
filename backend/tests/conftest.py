"""Shared fixtures for backend unit tests.

Provides an in-memory SQLite session so tests run fast and don't touch the
real Supabase database.  Uses StaticPool + check_same_thread=False so the
FastAPI TestClient (which runs handlers in a worker thread) can share the
same in-memory database.
"""
import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine


@pytest.fixture()
def session():
    """Yield an in-memory SQLite session with all tables created."""
    engine = create_engine(
        "sqlite://",
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s
