import os
from sqlmodel import create_engine, Session, SQLModel
from dotenv import load_dotenv

load_dotenv()

database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy ../.env.example to ../.env or create "
        "backend/.env, then fill in your Supabase PostgreSQL connection string."
    )

engine = create_engine(database_url)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
