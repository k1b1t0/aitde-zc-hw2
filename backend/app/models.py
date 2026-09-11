from typing import List, Literal, Optional, Any
from pydantic import BaseModel, Field

CardTag = Literal['feature', 'bug', 'urgent', 'design', 'docs']

class User(BaseModel):
    id: str
    name: str
    email: str
    avatar: str
    color: str

class UserInDB(User):
    hashed_password: str

class LoginRequest(BaseModel):
    email: str
    name: Optional[str] = None
    password: Optional[str] = None

class SwitchUserRequest(BaseModel):
    userId: str

class AuthResponse(BaseModel):
    user: User
    token: str

class Column(BaseModel):
    id: str
    boardId: str
    title: str
    order: int

class CreateColumnRequest(BaseModel):
    title: str

class UpdateColumnRequest(BaseModel):
    title: str

class ReorderColumnsRequest(BaseModel):
    columnIds: List[str]

class Card(BaseModel):
    id: str
    columnId: str
    title: str
    description: str = ''
    assigneeId: Optional[str] = None
    tags: List[CardTag] = Field(default_factory=list)
    dueDate: Optional[str] = None
    order: int
    createdAt: str
    updatedAt: str

class CreateCardRequest(BaseModel):
    columnId: str
    title: str
    description: Optional[str] = ''
    assigneeId: Optional[str] = None
    tags: Optional[List[CardTag]] = None
    dueDate: Optional[str] = None
    order: Optional[int] = None

class UpdateCardRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigneeId: Optional[str] = None
    tags: Optional[List[CardTag]] = None
    dueDate: Optional[str] = None
    order: Optional[int] = None

class MoveCardRequest(BaseModel):
    targetColumnId: str
    newOrder: int

class Board(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    ownerId: str
    inviteToken: str
    members: List[User] = Field(default_factory=list)
    columns: List[Column] = Field(default_factory=list)
    cards: List[Card] = Field(default_factory=list)

class CreateBoardRequest(BaseModel):
    title: str
    description: Optional[str] = None

class InviteUrlResponse(BaseModel):
    inviteUrl: str
    inviteToken: str

class CardLock(BaseModel):
    cardId: str
    userId: str
    userName: str
    userColor: str
    lockedAt: int

class AcquireLockResponse(BaseModel):
    acquired: bool
    lock: Optional[CardLock] = None

class LiveTypingEvent(BaseModel):
    cardId: str
    userId: str
    userName: str
    field: Literal['title', 'description']
    value: str

class WebSocketMessage(BaseModel):
    type: str
    boardId: str
    senderId: str
    payload: Any
    timestamp: int

class ErrorResponse(BaseModel):
    detail: str
