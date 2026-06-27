import os
from pathlib import Path
from sqlmodel import create_engine, Session, SQLModel
from dotenv import load_dotenv

# Load backend/.env regardless of working directory
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

engine = create_engine(os.environ["DATABASE_URL"])


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
