import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Database-agnostic configuration via environment variable (default: SQLite)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kanban.db")

# Handle SQLite-specific connect args conditionally so Postgres/MySQL work out-of-the-box
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
