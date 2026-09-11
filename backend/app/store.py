import datetime
import json
import time
from typing import Dict, List, Optional, Set, Tuple
from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.auth import get_password_hash
from app.database import Base, SessionLocal, engine
from app.db_models import BoardDB, CardDB, ColumnDB, UserDB, board_members
from app.models import (
    Board,
    Card,
    CardLock,
    Column,
    User,
    UserInDB,
    WebSocketMessage,
)

class DatabaseStore:
    def __init__(self):
        # In-memory ephemeral states for real-time collaboration
        self.card_locks: Dict[str, Dict[str, CardLock]] = {}  # boardId -> (cardId -> lock)
        self.active_connections: Dict[str, Set[WebSocket]] = {}  # boardId -> active websockets

    def init_db(self):
        # Create tables
        Base.metadata.create_all(bind=engine)

        # Seed initial data if empty
        with SessionLocal() as db:
            if db.query(UserDB).count() == 0:
                self.seed_data(db)

    def seed_data(self, db: Session):
        default_pw_hash = get_password_hash("password123")

        demo_users = [
            UserDB(
                id="user-1",
                name="Alex Morgan",
                email="alex@example.com",
                avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                color="#3b82f6",
                hashed_password=default_pw_hash,
            ),
            UserDB(
                id="user-2",
                name="Sarah Chen",
                email="sarah@example.com",
                avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
                color="#10b981",
                hashed_password=default_pw_hash,
            ),
            UserDB(
                id="user-3",
                name="David Kim",
                email="david@example.com",
                avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
                color="#8b5cf6",
                hashed_password=default_pw_hash,
            ),
            UserDB(
                id="user-4",
                name="Elena Rostova",
                email="elena@example.com",
                avatar="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
                color="#f59e0b",
                hashed_password=default_pw_hash,
            ),
        ]
        db.add_all(demo_users)
        db.flush()

        initial_board = BoardDB(
            id="board-demo-1",
            title="Team Product Launch",
            description="Collaborative Sprint Kanban with real-time multi-user live sync",
            owner_id="user-1",
            invite_token="invite-collab-xyz",
        )
        initial_board.members = demo_users
        db.add(initial_board)
        db.flush()

        columns = [
            ColumnDB(id="col-1", board_id="board-demo-1", title="To Do", order=0),
            ColumnDB(id="col-2", board_id="board-demo-1", title="In Progress", order=1),
            ColumnDB(id="col-3", board_id="board-demo-1", title="Review", order=2),
            ColumnDB(id="col-4", board_id="board-demo-1", title="Done", order=3),
        ]
        db.add_all(columns)
        db.flush()

        cards = [
            CardDB(
                id="card-1",
                column_id="col-1",
                title="Design interactive landing page mockups",
                description="Figma wireframes with hero layout, feature grid, and responsive mobile view.",
                assignee_id="user-2",
                tags=json.dumps(["design"]),
                due_date="2026-09-18",
                order=0,
                created_at="2026-09-10T10:00:00Z",
                updated_at="2026-09-10T10:00:00Z",
            ),
            CardDB(
                id="card-2",
                column_id="col-1",
                title="Define WebSocket authentication handshake",
                description="Implement JWT token parsing on incoming WebSocket upgrade connections.",
                assignee_id="user-1",
                tags=json.dumps(["feature", "urgent"]),
                due_date="2026-09-14",
                order=1,
                created_at="2026-09-10T11:30:00Z",
                updated_at="2026-09-10T11:30:00Z",
            ),
            CardDB(
                id="card-3",
                column_id="col-2",
                title="Real-time card lock broadcast mechanism",
                description="Notify peers instantly when someone opens card editing to avoid conflicting edits.",
                assignee_id="user-3",
                tags=json.dumps(["feature"]),
                due_date="2026-09-15",
                order=0,
                created_at="2026-09-10T14:00:00Z",
                updated_at="2026-09-10T14:00:00Z",
            ),
            CardDB(
                id="card-4",
                column_id="col-3",
                title="Fix card reorder jitter on high-frequency drag",
                description="Apply Last-Write-Wins position resolution with CSS transition dampening.",
                assignee_id="user-4",
                tags=json.dumps(["bug"]),
                due_date="2026-09-12",
                order=0,
                created_at="2026-09-09T09:00:00Z",
                updated_at="2026-09-10T16:00:00Z",
            ),
            CardDB(
                id="card-5",
                column_id="col-4",
                title="Project architecture setup and scope sign-off",
                description="All functional requirements locked in with client stakeholders.",
                assignee_id="user-1",
                tags=json.dumps(["docs"]),
                due_date="2026-09-11",
                order=0,
                created_at="2026-09-08T08:00:00Z",
                updated_at="2026-09-11T09:00:00Z",
            ),
        ]
        db.add_all(cards)
        db.commit()

    # --- Conversion Helpers ---
    def _user_db_to_model(self, u: UserDB) -> User:
        return User(
            id=u.id,
            name=u.name,
            email=u.email,
            avatar=u.avatar,
            color=u.color,
        )

    def _card_db_to_model(self, c: CardDB) -> Card:
        tags = []
        try:
            tags = json.loads(c.tags)
        except Exception:
            pass
        return Card(
            id=c.id,
            columnId=c.column_id,
            title=c.title,
            description=c.description or "",
            assigneeId=c.assignee_id,
            tags=tags,
            dueDate=c.due_date,
            order=c.order,
            createdAt=c.created_at,
            updatedAt=c.updated_at,
        )

    def _column_db_to_model(self, col: ColumnDB) -> Column:
        return Column(
            id=col.id,
            boardId=col.board_id,
            title=col.title,
            order=col.order,
        )

    def _board_db_to_model(self, b: BoardDB) -> Board:
        members = [self._user_db_to_model(m) for m in b.members]
        columns = [self._column_db_to_model(col) for col in sorted(b.columns, key=lambda x: x.order)]
        all_cards = []
        for col in b.columns:
            for card in col.cards:
                all_cards.append(self._card_db_to_model(card))
        all_cards.sort(key=lambda x: x.order)
        return Board(
            id=b.id,
            title=b.title,
            description=b.description,
            ownerId=b.owner_id,
            inviteToken=b.invite_token,
            members=members,
            columns=columns,
            cards=all_cards,
        )

    # --- Users ---
    def get_user(self, user_id: str) -> Optional[User]:
        with SessionLocal() as db:
            u = db.query(UserDB).filter(UserDB.id == user_id).first()
            if u:
                return self._user_db_to_model(u)
            return None

    def get_user_in_db_by_email(self, email: str) -> Optional[UserInDB]:
        with SessionLocal() as db:
            u = db.query(UserDB).filter(UserDB.email.ilike(email.strip())).first()
            if u:
                return UserInDB(
                    id=u.id,
                    name=u.name,
                    email=u.email,
                    avatar=u.avatar,
                    color=u.color,
                    hashed_password=u.hashed_password,
                )
            return None

    def create_user(self, email: str, name: Optional[str] = None, password: Optional[str] = None) -> User:
        with SessionLocal() as db:
            user_id = f"user-{int(time.time() * 1000)}"
            display_name = name or email.split("@")[0]
            hashed = get_password_hash(password or "password123")
            colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"]
            color = colors[int(time.time()) % len(colors)]
            new_u = UserDB(
                id=user_id,
                name=display_name,
                email=email.strip().lower(),
                avatar=f"https://api.dicebear.com/7.x/bottts/svg?seed={display_name}",
                color=color,
                hashed_password=hashed,
            )
            db.add(new_u)
            db.commit()
            return self._user_db_to_model(new_u)

    def list_demo_users(self) -> List[User]:
        with SessionLocal() as db:
            users = db.query(UserDB).filter(UserDB.id.like("user-%")).all()
            return [self._user_db_to_model(u) for u in users]

    # --- Boards ---
    def list_boards(self, user_id: str) -> List[Board]:
        with SessionLocal() as db:
            boards = (
                db.query(BoardDB)
                .filter((BoardDB.owner_id == user_id) | BoardDB.members.any(UserDB.id == user_id))
                .all()
            )
            return [self._board_db_to_model(b) for b in boards]

    def get_board(self, board_id: str) -> Optional[Board]:
        with SessionLocal() as db:
            b = db.query(BoardDB).filter(BoardDB.id == board_id).first()
            if b:
                return self._board_db_to_model(b)
            return None

    def create_board(self, title: str, description: Optional[str], owner: User) -> Board:
        with SessionLocal() as db:
            b_id = f"board-{int(time.time() * 1000)}"
            owner_db = db.query(UserDB).filter(UserDB.id == owner.id).first()
            new_board = BoardDB(
                id=b_id,
                title=title,
                description=description,
                owner_id=owner.id,
                invite_token=f"invite-{int(time.time())}",
            )
            if owner_db:
                new_board.members.append(owner_db)
            db.add(new_board)
            db.flush()

            columns = [
                ColumnDB(id=f"col-{b_id}-1", board_id=b_id, title="To Do", order=0),
                ColumnDB(id=f"col-{b_id}-2", board_id=b_id, title="In Progress", order=1),
                ColumnDB(id=f"col-{b_id}-3", board_id=b_id, title="Done", order=2),
            ]
            db.add_all(columns)
            db.commit()
            db.refresh(new_board)
            return self._board_db_to_model(new_board)

    def join_board_by_token(self, token: str, user: User) -> Optional[Board]:
        with SessionLocal() as db:
            b = db.query(BoardDB).filter((BoardDB.invite_token == token) | (BoardDB.id == token)).first()
            if not b:
                return None
            user_db = db.query(UserDB).filter(UserDB.id == user.id).first()
            if user_db and not any(m.id == user.id for m in b.members):
                b.members.append(user_db)
                db.commit()
                db.refresh(b)
            return self._board_db_to_model(b)

    # --- Columns ---
    def create_column(self, board_id: str, title: str) -> Optional[Column]:
        with SessionLocal() as db:
            board = db.query(BoardDB).filter(BoardDB.id == board_id).first()
            if not board:
                return None
            col_id = f"col-{int(time.time() * 1000)}"
            col_order = len(board.columns)
            new_col = ColumnDB(id=col_id, board_id=board_id, title=title, order=col_order)
            db.add(new_col)
            db.commit()
            db.refresh(new_col)
            return self._column_db_to_model(new_col)

    def update_column(self, column_id: str, title: str) -> Optional[Tuple[Column, str]]:
        with SessionLocal() as db:
            col = db.query(ColumnDB).filter(ColumnDB.id == column_id).first()
            if not col:
                return None
            col.title = title
            board_id = col.board_id
            db.commit()
            db.refresh(col)
            return self._column_db_to_model(col), board_id

    def delete_column(self, column_id: str) -> Optional[str]:
        with SessionLocal() as db:
            col = db.query(ColumnDB).filter(ColumnDB.id == column_id).first()
            if not col:
                return None
            board_id = col.board_id
            db.delete(col)
            db.commit()
            return board_id

    def reorder_columns(self, board_id: str, column_ids: List[str]) -> Optional[List[Column]]:
        with SessionLocal() as db:
            board = db.query(BoardDB).filter(BoardDB.id == board_id).first()
            if not board:
                return None
            for idx, cid in enumerate(column_ids):
                col = db.query(ColumnDB).filter(ColumnDB.id == cid, ColumnDB.board_id == board_id).first()
                if col:
                    col.order = idx
            db.commit()
            db.refresh(board)
            return [self._column_db_to_model(c) for c in sorted(board.columns, key=lambda x: x.order)]

    # --- Cards ---
    def create_card(
        self,
        column_id: str,
        title: str,
        description: str,
        assignee_id: Optional[str],
        tags: List[str],
        due_date: Optional[str],
        order: Optional[int],
    ) -> Optional[Tuple[Card, str]]:
        with SessionLocal() as db:
            col = db.query(ColumnDB).filter(ColumnDB.id == column_id).first()
            if not col:
                return None
            board_id = col.board_id
            now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
            card_order = order if order is not None else len(col.cards)
            new_card = CardDB(
                id=f"card-{int(time.time() * 1000)}",
                column_id=column_id,
                title=title,
                description=description or "",
                assignee_id=assignee_id,
                tags=json.dumps(tags or ["feature"]),
                due_date=due_date,
                order=card_order,
                created_at=now_str,
                updated_at=now_str,
            )
            db.add(new_card)
            db.commit()
            db.refresh(new_card)
            return self._card_db_to_model(new_card), board_id

    def update_card(self, card_id: str, updates: dict) -> Optional[Tuple[Card, str]]:
        with SessionLocal() as db:
            card = db.query(CardDB).filter(CardDB.id == card_id).first()
            if not card:
                return None
            board_id = card.column.board_id
            for k, v in updates.items():
                if k == "tags" and isinstance(v, list):
                    card.tags = json.dumps(v)
                elif k == "assigneeId":
                    card.assignee_id = v
                elif k == "dueDate":
                    card.due_date = v
                elif hasattr(card, k):
                    setattr(card, k, v)
            card.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
            db.commit()
            db.refresh(card)
            return self._card_db_to_model(card), board_id

    def move_card(self, card_id: str, target_column_id: str, new_order: int) -> Optional[Tuple[Card, str]]:
        with SessionLocal() as db:
            card = db.query(CardDB).filter(CardDB.id == card_id).first()
            if not card:
                return None
            target_col = db.query(ColumnDB).filter(ColumnDB.id == target_column_id).first()
            if not target_col:
                return None
            board_id = target_col.board_id
            card.column_id = target_column_id
            card.order = new_order
            card.updated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

            # Reorder other cards in target column
            target_cards = (
                db.query(CardDB)
                .filter(CardDB.column_id == target_column_id, CardDB.id != card_id)
                .order_by(CardDB.order)
                .all()
            )
            target_cards.insert(new_order, card)
            for idx, c in enumerate(target_cards):
                c.order = idx

            db.commit()
            db.refresh(card)
            return self._card_db_to_model(card), board_id

    def delete_card(self, card_id: str) -> Optional[str]:
        with SessionLocal() as db:
            card = db.query(CardDB).filter(CardDB.id == card_id).first()
            if not card:
                return None
            board_id = card.column.board_id
            db.delete(card)
            db.commit()

            # Clean up ephemeral lock for this card
            if board_id in self.card_locks and card_id in self.card_locks[board_id]:
                del self.card_locks[board_id][card_id]
            return board_id

    # --- Ephemeral Locks ---
    def get_board_locks(self, board_id: str) -> List[CardLock]:
        locks = self.card_locks.get(board_id, {})
        now = int(time.time() * 1000)
        # Filter locks older than 45s
        active = [l for l in locks.values() if now - l.lockedAt < 45000]
        return active

    def acquire_lock(self, board_id: str, card_id: str, user: User) -> bool:
        if board_id not in self.card_locks:
            self.card_locks[board_id] = {}
        locks = self.card_locks[board_id]
        now = int(time.time() * 1000)
        current = locks.get(card_id)
        if current and current.userId != user.id and (now - current.lockedAt < 45000):
            return False
        locks[card_id] = CardLock(
            cardId=card_id,
            userId=user.id,
            userName=user.name,
            userColor=user.color,
            lockedAt=now,
        )
        return True

    def release_lock(self, board_id: str, card_id: str, user_id: Optional[str] = None) -> bool:
        if board_id in self.card_locks and card_id in self.card_locks[board_id]:
            current = self.card_locks[board_id][card_id]
            if user_id and current.userId != user_id:
                return False
            del self.card_locks[board_id][card_id]
            return True
        return False

    # --- WebSocket connection management ---
    def add_connection(self, board_id: str, websocket: WebSocket):
        if board_id not in self.active_connections:
            self.active_connections[board_id] = set()
        self.active_connections[board_id].add(websocket)

    def remove_connection(self, board_id: str, websocket: WebSocket):
        if board_id in self.active_connections:
            self.active_connections[board_id].discard(websocket)

    async def broadcast_to_board(self, board_id: str, message: WebSocketMessage):
        if board_id in self.active_connections:
            dead = set()
            json_str = message.model_dump_json()
            for ws in list(self.active_connections[board_id]):
                try:
                    await ws.send_text(json_str)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.active_connections[board_id].discard(ws)

store = DatabaseStore()
