import os
from pathlib import Path
from sqlmodel import create_engine, Session, SQLModel
from dotenv import load_dotenv

# Load .env from backend/ first, then fall back to project root
_backend_dir = Path(__file__).resolve().parents[1]
load_dotenv(_backend_dir / ".env")                          # backend/.env (if present)
load_dotenv(_backend_dir.parent / ".env", override=False)   # project-root .env

engine = create_engine(os.environ["DATABASE_URL"])


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
