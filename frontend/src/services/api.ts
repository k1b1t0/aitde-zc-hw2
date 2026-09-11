import {
  Board,
  Card,
  CardLock,
  Column,
  ConnectionStatus,
  LiveTypingEvent,
  RealtimeSubscriber,
  User,
} from '../types'

export interface KanbanService {
  // Auth
  getCurrentUser(): Promise<User | null>
  login(email: string, name?: string): Promise<User>
  logout(): Promise<void>
  getDemoUsers(): User[]
  switchUser(userId: string): Promise<User>

  // Boards
  getBoard(boardId: string): Promise<Board>
  createBoard(title: string, description?: string): Promise<Board>
  getBoards(): Promise<Board[]>
  joinBoardByToken(token: string): Promise<Board>
  generateInviteUrl(boardId: string): Promise<string>

  // Columns
  createColumn(boardId: string, title: string): Promise<Column>
  updateColumn(columnId: string, title: string): Promise<Column>
  deleteColumn(columnId: string): Promise<void>
  reorderColumns(boardId: string, columnIds: string[]): Promise<Column[]>

  // Cards
  createCard(card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): Promise<Card>
  updateCard(cardId: string, updates: Partial<Card>): Promise<Card>
  moveCard(cardId: string, targetColumnId: string, newOrder: number): Promise<Card>
  deleteCard(cardId: string): Promise<void>

  // Real-time / Collaboration
  subscribeToBoard(boardId: string, subscriber: RealtimeSubscriber): () => void
  getConnectionStatus(): ConnectionStatus
  onConnectionStatusChange(listener: (status: ConnectionStatus) => void): () => void
  toggleSimulatedDisconnect(disconnect?: boolean): boolean
  
  // Presence & Locks
  acquireCardLock(boardId: string, cardId: string): Promise<boolean>
  releaseCardLock(boardId: string, cardId: string): Promise<void>
  getCardLocks(boardId: string): CardLock[]
  
  // Live Typing
  sendLiveTyping(boardId: string, typing: LiveTypingEvent): void
  sendTypingStopped(boardId: string, cardId: string): void
  
  // Peer simulation (for demo testing live sync)
  triggerSimulatedPeerActivity(boardId: string): Promise<void>
}
