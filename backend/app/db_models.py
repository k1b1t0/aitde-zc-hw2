import json
from typing import List, Optional
from sqlalchemy import Column, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import relationship

from app.database import Base

# Association table for board members
board_members = Table(
    "board_members",
    Base.metadata,
    Column("board_id", String, ForeignKey("boards.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)

class UserDB(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    avatar = Column(String, nullable=False)
    color = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)

    boards = relationship("BoardDB", secondary=board_members, back_populates="members")

class BoardDB(Base):
    __tablename__ = "boards"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    invite_token = Column(String, unique=True, index=True, nullable=False)

    members = relationship("UserDB", secondary=board_members, back_populates="boards")
    columns = relationship("ColumnDB", back_populates="board", cascade="all, delete-orphan", order_by="ColumnDB.order")

class ColumnDB(Base):
    __tablename__ = "columns"

    id = Column(String, primary_key=True, index=True)
    board_id = Column(String, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    order = Column(Integer, nullable=False, default=0)

    board = relationship("BoardDB", back_populates="columns")
    cards = relationship("CardDB", back_populates="column", cascade="all, delete-orphan", order_by="CardDB.order")

class CardDB(Base):
    __tablename__ = "cards"

    id = Column(String, primary_key=True, index=True)
    column_id = Column(String, ForeignKey("columns.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False, default="")
    assignee_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    tags = Column(String, nullable=False, default="[]")  # JSON encoded list of tags
    due_date = Column(String, nullable=True)
    order = Column(Integer, nullable=False, default=0)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    column = relationship("ColumnDB", back_populates="cards")
    assignee = relationship("UserDB")

    def get_tags_list(self) -> List[str]:
        try:
            return json.loads(self.tags)
        except Exception:
            return []

    def set_tags_list(self, tags: List[str]):
        self.tags = json.dumps(tags)
