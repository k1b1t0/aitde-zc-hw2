export interface User {
  id: string
  name: string
  email: string
  avatar: string
  color: string
}

export type CardTag = 'feature' | 'bug' | 'urgent' | 'design' | 'docs'

export interface Card {
  id: string
  columnId: string
  title: string
  description: string
  assigneeId?: string
  tags: CardTag[]
  dueDate?: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface Column {
  id: string
  boardId: string
  title: string
  order: number
}

export interface Board {
  id: string
  title: string
  description?: string
  ownerId: string
  inviteToken: string
  members: User[]
  columns: Column[]
  cards: Card[]
}

export interface CardLock {
  cardId: string
  userId: string
  userName: string
  userColor: string
  lockedAt: number
}

export interface LiveTypingEvent {
  cardId: string
  userId: string
  userName: string
  field: 'title' | 'description'
  value: string
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

export type WebSocketEventType =
  | 'CARD_CREATED'
  | 'CARD_UPDATED'
  | 'CARD_MOVED'
  | 'CARD_DELETED'
  | 'COLUMN_CREATED'
  | 'COLUMN_UPDATED'
  | 'COLUMN_DELETED'
  | 'COLUMN_REORDERED'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'CARD_LOCKED'
  | 'CARD_UNLOCKED'
  | 'LIVE_TYPING'
  | 'BOARD_RESET'

export interface WebSocketMessage<T = any> {
  type: WebSocketEventType
  boardId: string
  senderId: string
  payload: T
  timestamp: number
}

export type RealtimeSubscriber = (message: WebSocketMessage) => void
