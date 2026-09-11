import {
  Board,
  Card,
  CardLock,
  Column,
  ConnectionStatus,
  LiveTypingEvent,
  RealtimeSubscriber,
  User,
  WebSocketMessage,
} from '../types'
import { KanbanService } from './api'

const DEMO_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Alex Morgan',
    email: 'alex@example.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    color: '#3b82f6', // blue
  },
  {
    id: 'user-2',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    color: '#10b981', // emerald
  },
  {
    id: 'user-3',
    name: 'David Kim',
    email: 'david@example.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    color: '#8b5cf6', // purple
  },
  {
    id: 'user-4',
    name: 'Elena Rostova',
    email: 'elena@example.com',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    color: '#f59e0b', // amber
  },
]

const INITIAL_BOARD: Board = {
  id: 'board-demo-1',
  title: 'Team Product Launch',
  description: 'Collaborative Sprint Kanban with real-time multi-user live sync',
  ownerId: 'user-1',
  inviteToken: 'invite-collab-xyz',
  members: [...DEMO_USERS],
  columns: [
    { id: 'col-1', boardId: 'board-demo-1', title: 'To Do', order: 0 },
    { id: 'col-2', boardId: 'board-demo-1', title: 'In Progress', order: 1 },
    { id: 'col-3', boardId: 'board-demo-1', title: 'Review', order: 2 },
    { id: 'col-4', boardId: 'board-demo-1', title: 'Done', order: 3 },
  ],
  cards: [
    {
      id: 'card-1',
      columnId: 'col-1',
      title: 'Design interactive landing page mockups',
      description: 'Figma wireframes with hero layout, feature grid, and responsive mobile view.',
      assigneeId: 'user-2',
      tags: ['design'],
      dueDate: '2026-09-18',
      order: 0,
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 'card-2',
      columnId: 'col-1',
      title: 'Define WebSocket authentication handshake',
      description: 'Implement JWT token parsing on incoming WebSocket upgrade connections.',
      assigneeId: 'user-1',
      tags: ['feature', 'urgent'],
      dueDate: '2026-09-14',
      order: 1,
      createdAt: '2026-09-10T11:30:00Z',
      updatedAt: '2026-09-10T11:30:00Z',
    },
    {
      id: 'card-3',
      columnId: 'col-2',
      title: 'Real-time card lock broadcast mechanism',
      description: 'Notify peers instantly when someone opens card editing to avoid conflicting edits.',
      assigneeId: 'user-3',
      tags: ['feature'],
      dueDate: '2026-09-15',
      order: 0,
      createdAt: '2026-09-10T14:00:00Z',
      updatedAt: '2026-09-10T14:00:00Z',
    },
    {
      id: 'card-4',
      columnId: 'col-3',
      title: 'Fix card reorder jitter on high-frequency drag',
      description: 'Apply Last-Write-Wins position resolution with CSS transition dampening.',
      assigneeId: 'user-4',
      tags: ['bug'],
      dueDate: '2026-09-12',
      order: 0,
      createdAt: '2026-09-09T09:00:00Z',
      updatedAt: '2026-09-10T16:00:00Z',
    },
    {
      id: 'card-5',
      columnId: 'col-4',
      title: 'Project architecture setup and scope sign-off',
      description: 'All functional requirements locked in with client stakeholders.',
      assigneeId: 'user-1',
      tags: ['docs'],
      dueDate: '2026-09-11',
      order: 0,
      createdAt: '2026-09-08T08:00:00Z',
      updatedAt: '2026-09-11T09:00:00Z',
    },
  ],
}

export class MockKanbanService implements KanbanService {
  private currentUser: User = DEMO_USERS[0]
  private boards: Map<string, Board> = new Map()
  private subscribers: Map<string, Set<RealtimeSubscriber>> = new Map()
  private connectionStatus: ConnectionStatus = 'connected'
  private connectionListeners: Set<(status: ConnectionStatus) => void> = new Set()
  private cardLocks: Map<string, Map<string, CardLock>> = new Map() // boardId -> (cardId -> lock)

  constructor() {
    this.initFromStorage()
  }

  private initFromStorage() {
    try {
      const savedUser = localStorage.getItem('kanban_current_user')
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser)
      }
      const savedBoards = localStorage.getItem('kanban_boards')
      if (savedBoards) {
        const parsed = JSON.parse(savedBoards) as Board[]
        parsed.forEach((b) => this.boards.set(b.id, b))
      }
    } catch {
      // ignore storage errors
    }

    if (!this.boards.has(INITIAL_BOARD.id)) {
      this.boards.set(INITIAL_BOARD.id, JSON.parse(JSON.stringify(INITIAL_BOARD)))
      this.persist()
    }
  }

  private persist() {
    try {
      localStorage.setItem('kanban_current_user', JSON.stringify(this.currentUser))
      localStorage.setItem('kanban_boards', JSON.stringify(Array.from(this.boards.values())))
    } catch {
      // ignore storage errors
    }
  }

  private broadcast(boardId: string, message: WebSocketMessage) {
    if (this.connectionStatus !== 'connected') {
      return
    }
    const subs = this.subscribers.get(boardId)
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(message)
        } catch (err) {
          console.error('Subscriber callback error:', err)
        }
      })
    }
  }

  // --- Auth ---
  async getCurrentUser(): Promise<User | null> {
    return this.currentUser
  }

  async login(email: string, name?: string): Promise<User> {
    let user = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        name: name || email.split('@')[0],
        email,
        avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
        color: '#06b6d4',
      }
    }
    this.currentUser = user
    this.persist()
    return user
  }

  async logout(): Promise<void> {
    this.currentUser = DEMO_USERS[0]
    this.persist()
  }

  getDemoUsers(): User[] {
    return DEMO_USERS
  }

  async switchUser(userId: string): Promise<User> {
    const user = DEMO_USERS.find((u) => u.id === userId)
    if (!user) {
      throw new Error(`User with ID ${userId} not found`)
    }
    this.currentUser = user
    this.persist()

    // Broadcast user switch / join to any active boards
    for (const [boardId] of this.boards) {
      this.broadcast(boardId, {
        type: 'USER_JOINED',
        boardId,
        senderId: user.id,
        payload: { user },
        timestamp: Date.now(),
      })
    }

    return user
  }

  // --- Boards ---
  async getBoard(boardId: string): Promise<Board> {
    const board = this.boards.get(boardId)
    if (!board) {
      throw new Error(`Board ${boardId} not found`)
    }
    return JSON.parse(JSON.stringify(board))
  }

  async getBoards(): Promise<Board[]> {
    return Array.from(this.boards.values()).map((b) => JSON.parse(JSON.stringify(b)))
  }

  async createBoard(title: string, description?: string): Promise<Board> {
    const id = `board-${Date.now()}`
    const newBoard: Board = {
      id,
      title,
      description,
      ownerId: this.currentUser.id,
      inviteToken: `invite-${Math.random().toString(36).substring(2, 9)}`,
      members: [this.currentUser],
      columns: [
        { id: `col-${id}-1`, boardId: id, title: 'To Do', order: 0 },
        { id: `col-${id}-2`, boardId: id, title: 'In Progress', order: 1 },
        { id: `col-${id}-3`, boardId: id, title: 'Done', order: 2 },
      ],
      cards: [],
    }

    this.boards.set(id, newBoard)
    this.persist()
    return JSON.parse(JSON.stringify(newBoard))
  }

  async joinBoardByToken(token: string): Promise<Board> {
    for (const board of this.boards.values()) {
      if (board.inviteToken === token || board.id === token) {
        if (!board.members.some((m) => m.id === this.currentUser.id)) {
          board.members.push(this.currentUser)
          this.persist()
          this.broadcast(board.id, {
            type: 'USER_JOINED',
            boardId: board.id,
            senderId: this.currentUser.id,
            payload: { user: this.currentUser },
            timestamp: Date.now(),
          })
        }
        return JSON.parse(JSON.stringify(board))
      }
    }
    throw new Error('Invalid invite link or token')
  }

  async generateInviteUrl(boardId: string): Promise<string> {
    const board = this.boards.get(boardId)
    if (!board) throw new Error('Board not found')
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
    return `${origin}/join/${board.inviteToken}`
  }

  // --- Columns ---
  async createColumn(boardId: string, title: string): Promise<Column> {
    const board = this.boards.get(boardId)
    if (!board) throw new Error('Board not found')

    const newCol: Column = {
      id: `col-${Date.now()}`,
      boardId,
      title,
      order: board.columns.length,
    }

    board.columns.push(newCol)
    this.persist()

    this.broadcast(boardId, {
      type: 'COLUMN_CREATED',
      boardId,
      senderId: this.currentUser.id,
      payload: { column: newCol },
      timestamp: Date.now(),
    })

    return { ...newCol }
  }

  async updateColumn(columnId: string, title: string): Promise<Column> {
    for (const board of this.boards.values()) {
      const col = board.columns.find((c) => c.id === columnId)
      if (col) {
        col.title = title
        this.persist()

        this.broadcast(board.id, {
          type: 'COLUMN_UPDATED',
          boardId: board.id,
          senderId: this.currentUser.id,
          payload: { column: col },
          timestamp: Date.now(),
        })

        return { ...col }
      }
    }
    throw new Error('Column not found')
  }

  async deleteColumn(columnId: string): Promise<void> {
    for (const board of this.boards.values()) {
      const index = board.columns.findIndex((c) => c.id === columnId)
      if (index !== -1) {
        board.columns.splice(index, 1)
        board.cards = board.cards.filter((c) => c.columnId !== columnId)
        this.persist()

        this.broadcast(board.id, {
          type: 'COLUMN_DELETED',
          boardId: board.id,
          senderId: this.currentUser.id,
          payload: { columnId },
          timestamp: Date.now(),
        })
        return
      }
    }
    throw new Error('Column not found')
  }

  async reorderColumns(boardId: string, columnIds: string[]): Promise<Column[]> {
    const board = this.boards.get(boardId)
    if (!board) throw new Error('Board not found')

    const colMap = new Map(board.columns.map((c) => [c.id, c]))
    const newColumns: Column[] = []

    columnIds.forEach((id, idx) => {
      const col = colMap.get(id)
      if (col) {
        col.order = idx
        newColumns.push(col)
      }
    })

    board.columns = newColumns
    this.persist()

    this.broadcast(boardId, {
      type: 'COLUMN_REORDERED',
      boardId,
      senderId: this.currentUser.id,
      payload: { columnIds },
      timestamp: Date.now(),
    })

    return [...board.columns]
  }

  // --- Cards ---
  async createCard(cardData: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): Promise<Card> {
    const targetBoard = Array.from(this.boards.values()).find((b) =>
      b.columns.some((c) => c.id === cardData.columnId)
    )
    if (!targetBoard) throw new Error('Column does not belong to any board')

    const now = new Date().toISOString()
    const newCard: Card = {
      ...cardData,
      id: `card-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    }

    targetBoard.cards.push(newCard)
    this.persist()

    this.broadcast(targetBoard.id, {
      type: 'CARD_CREATED',
      boardId: targetBoard.id,
      senderId: this.currentUser.id,
      payload: { card: newCard },
      timestamp: Date.now(),
    })

    return { ...newCard }
  }

  async updateCard(cardId: string, updates: Partial<Card>): Promise<Card> {
    for (const board of this.boards.values()) {
      const card = board.cards.find((c) => c.id === cardId)
      if (card) {
        Object.assign(card, updates, { updatedAt: new Date().toISOString() })
        this.persist()

        this.broadcast(board.id, {
          type: 'CARD_UPDATED',
          boardId: board.id,
          senderId: this.currentUser.id,
          payload: { card },
          timestamp: Date.now(),
        })

        return { ...card }
      }
    }
    throw new Error('Card not found')
  }

  async moveCard(cardId: string, targetColumnId: string, newOrder: number): Promise<Card> {
    for (const board of this.boards.values()) {
      const card = board.cards.find((c) => c.id === cardId)
      if (card) {
        card.columnId = targetColumnId
        card.order = newOrder
        card.updatedAt = new Date().toISOString()

        // Reorder cards in target column
        const columnCards = board.cards
          .filter((c) => c.columnId === targetColumnId && c.id !== cardId)
          .sort((a, b) => a.order - b.order)

        columnCards.splice(newOrder, 0, card)
        columnCards.forEach((c, idx) => {
          c.order = idx
        })

        this.persist()

        this.broadcast(board.id, {
          type: 'CARD_MOVED',
          boardId: board.id,
          senderId: this.currentUser.id,
          payload: { cardId, targetColumnId, newOrder, cards: board.cards },
          timestamp: Date.now(),
        })

        return { ...card }
      }
    }
    throw new Error('Card not found')
  }

  async deleteCard(cardId: string): Promise<void> {
    for (const board of this.boards.values()) {
      const index = board.cards.findIndex((c) => c.id === cardId)
      if (index !== -1) {
        board.cards.splice(index, 1)
        this.persist()

        // Release any locks
        const boardLocks = this.cardLocks.get(board.id)
        if (boardLocks && boardLocks.has(cardId)) {
          boardLocks.delete(cardId)
        }

        this.broadcast(board.id, {
          type: 'CARD_DELETED',
          boardId: board.id,
          senderId: this.currentUser.id,
          payload: { cardId },
          timestamp: Date.now(),
        })

        this.broadcast(board.id, {
          type: 'CARD_UNLOCKED',
          boardId: board.id,
          senderId: this.currentUser.id,
          payload: { cardId },
          timestamp: Date.now(),
        })

        return
      }
    }
    throw new Error('Card not found')
  }

  // --- Real-time Subscription ---
  subscribeToBoard(boardId: string, subscriber: RealtimeSubscriber): () => void {
    if (!this.subscribers.has(boardId)) {
      this.subscribers.set(boardId, new Set())
    }
    this.subscribers.get(boardId)!.add(subscriber)

    return () => {
      this.subscribers.get(boardId)?.delete(subscriber)
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  onConnectionStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.connectionListeners.add(listener)
    return () => {
      this.connectionListeners.delete(listener)
    }
  }

  toggleSimulatedDisconnect(disconnect?: boolean): boolean {
    const shouldDisconnect = disconnect !== undefined ? disconnect : this.connectionStatus === 'connected'
    if (shouldDisconnect) {
      this.connectionStatus = 'disconnected'
      this.connectionListeners.forEach((l) => l('disconnected'))
      // Automatically attempt reconnection after 2 seconds to showcase auto-reconnect
      setTimeout(() => {
        this.connectionStatus = 'connecting'
        this.connectionListeners.forEach((l) => l('connecting'))
        setTimeout(() => {
          this.connectionStatus = 'connected'
          this.connectionListeners.forEach((l) => l('connected'))
        }, 1200)
      }, 1500)
      return false
    } else {
      this.connectionStatus = 'connected'
      this.connectionListeners.forEach((l) => l('connected'))
      return true
    }
  }

  // --- Card Locks & Live Typing ---
  async acquireCardLock(boardId: string, cardId: string): Promise<boolean> {
    let boardLocks = this.cardLocks.get(boardId)
    if (!boardLocks) {
      boardLocks = new Map()
      this.cardLocks.set(boardId, boardLocks)
    }

    const currentLock = boardLocks.get(cardId)
    // If locked by someone else within 45s, lock cannot be acquired
    if (currentLock && currentLock.userId !== this.currentUser.id && Date.now() - currentLock.lockedAt < 45000) {
      return false
    }

    const newLock: CardLock = {
      cardId,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userColor: this.currentUser.color,
      lockedAt: Date.now(),
    }
    boardLocks.set(cardId, newLock)

    this.broadcast(boardId, {
      type: 'CARD_LOCKED',
      boardId,
      senderId: this.currentUser.id,
      payload: { lock: newLock },
      timestamp: Date.now(),
    })

    return true
  }

  async releaseCardLock(boardId: string, cardId: string): Promise<void> {
    const boardLocks = this.cardLocks.get(boardId)
    if (boardLocks && boardLocks.has(cardId)) {
      boardLocks.delete(cardId)
      this.broadcast(boardId, {
        type: 'CARD_UNLOCKED',
        boardId,
        senderId: this.currentUser.id,
        payload: { cardId },
        timestamp: Date.now(),
      })
    }
  }

  getCardLocks(boardId: string): CardLock[] {
    const boardLocks = this.cardLocks.get(boardId)
    if (!boardLocks) return []
    return Array.from(boardLocks.values())
  }

  sendLiveTyping(boardId: string, typing: LiveTypingEvent): void {
    // Broadcast live typing stream to all subscribers
    this.broadcast(boardId, {
      type: 'LIVE_TYPING',
      boardId,
      senderId: this.currentUser.id,
      payload: { typing },
      timestamp: Date.now(),
    })

    // Also update current state in-memory so newly joining users see recent text
    const board = this.boards.get(boardId)
    if (board) {
      const card = board.cards.find((c) => c.id === typing.cardId)
      if (card) {
        if (typing.field === 'title') card.title = typing.value
        if (typing.field === 'description') card.description = typing.value
        card.updatedAt = new Date().toISOString()
      }
    }
  }

  sendTypingStopped(boardId: string, cardId: string): void {
    this.broadcast(boardId, {
      type: 'TYPING_STOPPED',
      boardId,
      senderId: this.currentUser.id,
      payload: { cardId },
      timestamp: Date.now(),
    })
  }

  // Demo tool: simulate a teammate (e.g. Sarah) typing or moving a card in real-time!
  async triggerSimulatedPeerActivity(boardId: string): Promise<void> {
    const peer = DEMO_USERS.find((u) => u.id !== this.currentUser.id) || DEMO_USERS[1]
    const board = this.boards.get(boardId)
    if (!board || board.cards.length === 0) return

    const targetCard = board.cards[0]

    // 1. Peer locks the card
    const peerLock: CardLock = {
      cardId: targetCard.id,
      userId: peer.id,
      userName: peer.name,
      userColor: peer.color,
      lockedAt: Date.now(),
    }
    this.broadcast(boardId, {
      type: 'CARD_LOCKED',
      boardId,
      senderId: peer.id,
      payload: { lock: peerLock },
      timestamp: Date.now(),
    })

    // 2. Stream typing updates
    const textToAdd = ' [Updated by teammate live]'
    const originalTitle = targetCard.title
    let currentText = originalTitle

    for (let i = 0; i < textToAdd.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 80))
      currentText += textToAdd[i]
      this.broadcast(boardId, {
        type: 'LIVE_TYPING',
        boardId,
        senderId: peer.id,
        payload: {
          typing: {
            cardId: targetCard.id,
            userId: peer.id,
            userName: peer.name,
            field: 'title',
            value: currentText,
          },
        },
        timestamp: Date.now(),
      })
    }

    targetCard.title = currentText
    this.persist()

    // 3. Unlock card
    await new Promise((resolve) => setTimeout(resolve, 1000))
    this.broadcast(boardId, {
      type: 'CARD_UNLOCKED',
      boardId,
      senderId: peer.id,
      payload: { cardId: targetCard.id },
      timestamp: Date.now(),
    })
  }
}

// Singleton export
export const mockKanbanService = new MockKanbanService()
