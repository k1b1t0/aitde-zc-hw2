import time
import datetime
from typing import Dict, List, Optional, Set
from fastapi import WebSocket

from app.auth import get_password_hash
from app.models import (
    Board,
    Card,
    CardLock,
    Column,
    User,
    UserInDB,
    WebSocketMessage,
)

class InMemoryStore:
    def __init__(self):
        self.users: Dict[str, UserInDB] = {}
        self.boards: Dict[str, Board] = {}
        self.card_locks: Dict[str, Dict[str, CardLock]] = {}  # boardId -> (cardId -> lock)
        self.active_connections: Dict[str, Set[WebSocket]] = {}  # boardId -> active websockets
        self.seed_data()

    def seed_data(self):
        default_pw_hash = get_password_hash("password123")

        demo_users = [
            UserInDB(
                id="user-1",
                name="Alex Morgan",
                email="alex@example.com",
                avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                color="#3b82f6",
                hashed_password=default_pw_hash,
            ),
            UserInDB(
                id="user-2",
                name="Sarah Chen",
                email="sarah@example.com",
                avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
                color="#10b981",
                hashed_password=default_pw_hash,
            ),
            UserInDB(
                id="user-3",
                name="David Kim",
                email="david@example.com",
                avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
                color="#8b5cf6",
                hashed_password=default_pw_hash,
            ),
            UserInDB(
                id="user-4",
                name="Elena Rostova",
                email="elena@example.com",
                avatar="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
                color="#f59e0b",
                hashed_password=default_pw_hash,
            ),
        ]

        for u in demo_users:
            self.users[u.id] = u

        initial_board = Board(
            id="board-demo-1",
            title="Team Product Launch",
            description="Collaborative Sprint Kanban with real-time multi-user live sync",
            ownerId="user-1",
            inviteToken="invite-collab-xyz",
            members=[User(**u.model_dump()) for u in demo_users],
            columns=[
                Column(id="col-1", boardId="board-demo-1", title="To Do", order=0),
                Column(id="col-2", boardId="board-demo-1", title="In Progress", order=1),
                Column(id="col-3", boardId="board-demo-1", title="Review", order=2),
                Column(id="col-4", boardId="board-demo-1", title="Done", order=3),
            ],
            cards=[
                Card(
                    id="card-1",
                    columnId="col-1",
                    title="Design interactive landing page mockups",
                    description="Figma wireframes with hero layout, feature grid, and responsive mobile view.",
                    assigneeId="user-2",
                    tags=["design"],
                    dueDate="2026-09-18",
                    order=0,
                    createdAt="2026-09-10T10:00:00Z",
                    updatedAt="2026-09-10T10:00:00Z",
                ),
                Card(
                    id="card-2",
                    columnId="col-1",
                    title="Define WebSocket authentication handshake",
                    description="Implement JWT token parsing on incoming WebSocket upgrade connections.",
                    assigneeId="user-1",
                    tags=["feature", "urgent"],
                    dueDate="2026-09-14",
                    order=1,
                    createdAt="2026-09-10T11:30:00Z",
                    updatedAt="2026-09-10T11:30:00Z",
                ),
                Card(
                    id="card-3",
                    columnId="col-2",
                    title="Real-time card lock broadcast mechanism",
                    description="Notify peers instantly when someone opens card editing to avoid conflicting edits.",
                    assigneeId="user-3",
                    tags=["feature"],
                    dueDate="2026-09-15",
                    order=0,
                    createdAt="2026-09-10T14:00:00Z",
                    updatedAt="2026-09-10T14:00:00Z",
                ),
                Card(
                    id="card-4",
                    columnId="col-3",
                    title="Fix card reorder jitter on high-frequency drag",
                    description="Apply Last-Write-Wins position resolution with CSS transition dampening.",
                    assigneeId="user-4",
                    tags=["bug"],
                    dueDate="2026-09-12",
                    order=0,
                    createdAt="2026-09-09T09:00:00Z",
                    updatedAt="2026-09-10T16:00:00Z",
                ),
                Card(
                    id="card-5",
                    columnId="col-4",
                    title="Project architecture setup and scope sign-off",
                    description="All functional requirements locked in with client stakeholders.",
                    assigneeId="user-1",
                    tags=["docs"],
                    dueDate="2026-09-11",
                    order=0,
                    createdAt="2026-09-08T08:00:00Z",
                    updatedAt="2026-09-11T09:00:00Z",
                ),
            ],
        )

        self.boards[initial_board.id] = initial_board
        self.card_locks[initial_board.id] = {}

    # --- Users ---
    def get_user(self, user_id: str) -> Optional[User]:
        u = self.users.get(user_id)
        if u:
            return User(**u.model_dump())
        return None

    def get_user_in_db_by_email(self, email: str) -> Optional[UserInDB]:
        for u in self.users.values():
            if u.email.lower() == email.lower():
                return u
        return None

    def create_user(self, email: str, name: Optional[str] = None, password: Optional[str] = None) -> User:
        user_id = f"user-{int(time.time() * 1000)}"
        display_name = name or email.split("@")[0]
        hashed = get_password_hash(password or "password123")
        new_u = UserInDB(
            id=user_id,
            name=display_name,
            email=email,
            avatar="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
            color="#06b6d4",
            hashed_password=hashed,
        )
        self.users[user_id] = new_u
        return User(**new_u.model_dump())

    def list_demo_users(self) -> List[User]:
        return [User(**u.model_dump()) for u in self.users.values() if u.id.startswith("user-")]

    # --- Boards ---
    def list_boards(self, user_id: str) -> List[Board]:
        return [
            b for b in self.boards.values()
            if any(m.id == user_id for m in b.members) or b.ownerId == user_id
        ]

    def get_board(self, board_id: str) -> Optional[Board]:
        return self.boards.get(board_id)

    def create_board(self, title: str, description: Optional[str], owner: User) -> Board:
        b_id = f"board-{int(time.time() * 1000)}"
        new_board = Board(
            id=b_id,
            title=title,
            description=description,
            ownerId=owner.id,
            inviteToken=f"invite-{int(time.time())}",
            members=[owner],
            columns=[
                Column(id=f"col-{b_id}-1", boardId=b_id, title="To Do", order=0),
                Column(id=f"col-{b_id}-2", boardId=b_id, title="In Progress", order=1),
                Column(id=f"col-{b_id}-3", boardId=b_id, title="Done", order=2),
            ],
            cards=[],
        )
        self.boards[b_id] = new_board
        self.card_locks[b_id] = {}
        return new_board

    def join_board_by_token(self, token: str, user: User) -> Optional[Board]:
        for b in self.boards.values():
            if b.inviteToken == token or b.id == token:
                if not any(m.id == user.id for m in b.members):
                    b.members.append(user)
                return b
        return None

    # --- Columns ---
    def create_column(self, board_id: str, title: str) -> Optional[Column]:
        board = self.boards.get(board_id)
        if not board:
            return None
        col_id = f"col-{int(time.time() * 1000)}"
        col = Column(
            id=col_id,
            boardId=board_id,
            title=title,
            order=len(board.columns),
        )
        board.columns.append(col)
        return col

    def update_column(self, column_id: str, title: str) -> Optional[Column]:
        for board in self.boards.values():
            for col in board.columns:
                if col.id == column_id:
                    col.title = title
                    return col
        return None

    def delete_column(self, column_id: str) -> bool:
        for board in self.boards.values():
            for idx, col in enumerate(board.columns):
                if col.id == column_id:
                    board.columns.pop(idx)
                    board.cards = [c for c in board.cards if c.columnId != column_id]
                    return True
        return False

    def reorder_columns(self, board_id: str, column_ids: List[str]) -> Optional[List[Column]]:
        board = self.boards.get(board_id)
        if not board:
            return None
        col_map = {c.id: c for c in board.columns}
        reordered = []
        for idx, cid in enumerate(column_ids):
            if cid in col_map:
                col = col_map[cid]
                col.order = idx
                reordered.append(col)
        board.columns = reordered
        return reordered

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
    ) -> Optional[Card]:
        for board in self.boards.values():
            if any(c.id == column_id for c in board.columns):
                col_cards = [c for c in board.cards if c.columnId == column_id]
                now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
                card_order = order if order is not None else len(col_cards)
                new_card = Card(
                    id=f"card-{int(time.time() * 1000)}",
                    columnId=column_id,
                    title=title,
                    description=description or "",
                    assigneeId=assignee_id,
                    tags=tags or ["feature"],
                    dueDate=due_date,
                    order=card_order,
                    createdAt=now_str,
                    updatedAt=now_str,
                )
                board.cards.append(new_card)
                return new_card
        return None

    def update_card(self, card_id: str, updates: dict) -> Optional[Card]:
        for board in self.boards.values():
            for card in board.cards:
                if card.id == card_id:
                    for k, v in updates.items():
                        if v is not None and hasattr(card, k):
                            setattr(card, k, v)
                    card.updatedAt = datetime.datetime.now(datetime.timezone.utc).isoformat()
                    return card
        return None

    def move_card(self, card_id: str, target_column_id: str, new_order: int) -> Optional[Card]:
        for board in self.boards.values():
            target_card = next((c for c in board.cards if c.id == card_id), None)
            if target_card:
                target_card.columnId = target_column_id
                target_card.order = new_order
                target_card.updatedAt = datetime.datetime.now(datetime.timezone.utc).isoformat()

                # Reorder cards in target column
                col_cards = [c for c in board.cards if c.columnId == target_column_id and c.id != card_id]
                col_cards.sort(key=lambda x: x.order)
                col_cards.insert(new_order, target_card)
                for idx, c in enumerate(col_cards):
                    c.order = idx
                return target_card
        return None

    def delete_card(self, card_id: str) -> bool:
        for board in self.boards.values():
            for idx, c in enumerate(board.cards):
                if c.id == card_id:
                    board.cards.pop(idx)
                    return True
        return False

    # --- Locks ---
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

    def release_lock(self, board_id: str, card_id: str):
        if board_id in self.card_locks and card_id in self.card_locks[board_id]:
            del self.card_locks[board_id][card_id]

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
            for ws in self.active_connections[board_id]:
                try:
                    await ws.send_text(json_str)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.active_connections[board_id].discard(ws)

store = InMemoryStore()
