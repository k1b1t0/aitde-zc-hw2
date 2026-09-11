import type {
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
import type { KanbanService } from './api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/v1/ws'

export class BackendKanbanService implements KanbanService {
  private token: string | null = null
  private currentUser: User | null = null
  private demoUsers: User[] = []
  private connectionStatus: ConnectionStatus = 'disconnected'
  private connectionListeners: Set<(status: ConnectionStatus) => void> = new Set()
  private ws: WebSocket | null = null
  private activeBoardId: string | null = null
  private subscribers: Map<string, Set<RealtimeSubscriber>> = new Map()
  private cardLocksCache: Map<string, CardLock[]> = new Map()
  private reconnectTimeout: any = null

  constructor() {
    this.token = localStorage.getItem('kanban_token')
    const userStr = localStorage.getItem('kanban_user')
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr)
      } catch {
        this.currentUser = null
      }
    }
  }

  private setConnectionStatus(status: ConnectionStatus) {
    this.connectionStatus = status
    this.connectionListeners.forEach((fn) => fn(status))
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (res.status === 204) {
      return null as unknown as T
    }

    if (!res.ok) {
      let errorMsg = `API Error: ${res.status} ${res.statusText}`
      try {
        const errorData = await res.json()
        if (errorData.detail) {
          errorMsg = errorData.detail
        }
      } catch {
        // ignore parse error
      }
      throw new Error(errorMsg)
    }

    return res.json() as Promise<T>
  }

  // --- Auth ---
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser
    }
    if (this.token) {
      try {
        const user = await this.request<User>('/auth/me')
        this.currentUser = user
        localStorage.setItem('kanban_user', JSON.stringify(user))
        return user
      } catch {
        this.token = null
        localStorage.removeItem('kanban_token')
      }
    }

    // Default to logging in as the first demo user (Alex) if no session exists
    try {
      return await this.login('alex@example.com')
    } catch {
      return null
    }
  }

  async login(email: string, name?: string): Promise<User> {
    const res = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, name, password: 'password123' }),
    })
    this.token = res.token
    this.currentUser = res.user
    localStorage.setItem('kanban_token', res.token)
    localStorage.setItem('kanban_user', JSON.stringify(res.user))
    return res.user
  }

  async logout(): Promise<void> {
    if (this.token) {
      try {
        await this.request<void>('/auth/logout', { method: 'POST' })
      } catch {
        // ignore
      }
    }
    this.token = null
    this.currentUser = null
    localStorage.removeItem('kanban_token')
    localStorage.removeItem('kanban_user')
    if (this.ws) {
      this.ws.close()
    }
  }

  getDemoUsers(): User[] {
    if (this.demoUsers.length > 0) {
      return this.demoUsers
    }
    // Fetch asynchronously in background, return default fallback
    this.request<User[]>('/auth/demo-users')
      .then((users) => {
        this.demoUsers = users
      })
      .catch(() => {})

    return [
      {
        id: 'user-1',
        name: 'Alex Morgan',
        email: 'alex@example.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        color: '#3b82f6',
      },
      {
        id: 'user-2',
        name: 'Sarah Chen',
        email: 'sarah@example.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        color: '#10b981',
      },
      {
        id: 'user-3',
        name: 'David Kim',
        email: 'david@example.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        color: '#8b5cf6',
      },
      {
        id: 'user-4',
        name: 'Elena Rostova',
        email: 'elena@example.com',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        color: '#f59e0b',
      },
    ]
  }

  async switchUser(userId: string): Promise<User> {
    const res = await this.request<{ user: User; token: string }>('/auth/switch-user', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
    this.token = res.token
    this.currentUser = res.user
    localStorage.setItem('kanban_token', res.token)
    localStorage.setItem('kanban_user', JSON.stringify(res.user))

    // Reconnect WebSocket with new token
    if (this.activeBoardId) {
      this.connectWebSocket(this.activeBoardId)
    }

    return res.user
  }

  // --- Boards ---
  async getBoard(boardId: string): Promise<Board> {
    const board = await this.request<Board>(`/boards/${boardId}`)
    // Fetch initial locks
    this.getCardLocks(boardId)
    return board
  }

  async getBoards(): Promise<Board[]> {
    return this.request<Board[]>('/boards')
  }

  async createBoard(title: string, description?: string): Promise<Board> {
    return this.request<Board>('/boards', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    })
  }

  async joinBoardByToken(token: string): Promise<Board> {
    return this.request<Board>(`/boards/join/${token}`, {
      method: 'POST',
    })
  }

  async generateInviteUrl(boardId: string): Promise<string> {
    const res = await this.request<{ inviteUrl: string; inviteToken: string }>(
      `/boards/${boardId}/invite-url`
    )
    return res.inviteUrl
  }

  // --- Columns ---
  async createColumn(boardId: string, title: string): Promise<Column> {
    return this.request<Column>(`/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
  }

  async updateColumn(columnId: string, title: string): Promise<Column> {
    return this.request<Column>(`/columns/${columnId}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    })
  }

  async deleteColumn(columnId: string): Promise<void> {
    await this.request<void>(`/columns/${columnId}`, {
      method: 'DELETE',
    })
  }

  async reorderColumns(boardId: string, columnIds: string[]): Promise<Column[]> {
    return this.request<Column[]>(`/boards/${boardId}/columns/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ columnIds }),
    })
  }

  // --- Cards ---
  async createCard(card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): Promise<Card> {
    return this.request<Card>('/cards', {
      method: 'POST',
      body: JSON.stringify(card),
    })
  }

  async updateCard(cardId: string, updates: Partial<Card>): Promise<Card> {
    return this.request<Card>(`/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async moveCard(cardId: string, targetColumnId: string, newOrder: number): Promise<Card> {
    return this.request<Card>(`/cards/${cardId}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetColumnId, newOrder }),
    })
  }

  async deleteCard(cardId: string): Promise<void> {
    await this.request<void>(`/cards/${cardId}`, {
      method: 'DELETE',
    })
  }

  // --- Real-time WebSocket ---
  private connectWebSocket(boardId: string) {
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        // ignore
      }
    }

    if (!this.token) {
      return
    }

    this.setConnectionStatus('connecting')
    const wsUrl = `${WS_BASE_URL}/boards/${boardId}?token=${this.token}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.setConnectionStatus('connected')
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WebSocketMessage
          const boardSubs = this.subscribers.get(boardId)
          if (boardSubs) {
            boardSubs.forEach((sub) => sub(msg))
          }
        } catch (err) {
          console.error('Error parsing WS message:', err)
        }
      }

      this.ws.onclose = () => {
        this.setConnectionStatus('disconnected')
        // Auto-reconnect after 2 seconds
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = setTimeout(() => {
          if (this.activeBoardId === boardId) {
            this.connectWebSocket(boardId)
          }
        }, 2000)
      }

      this.ws.onerror = () => {
        this.setConnectionStatus('disconnected')
      }
    } catch {
      this.setConnectionStatus('disconnected')
    }
  }

  subscribeToBoard(boardId: string, subscriber: RealtimeSubscriber): () => void {
    this.activeBoardId = boardId
    if (!this.subscribers.has(boardId)) {
      this.subscribers.set(boardId, new Set())
    }
    this.subscribers.get(boardId)!.add(subscriber)

    this.connectWebSocket(boardId)

    return () => {
      this.subscribers.get(boardId)?.delete(subscriber)
      if (this.subscribers.get(boardId)?.size === 0) {
        if (this.ws) {
          this.ws.close()
          this.ws = null
        }
      }
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

  toggleSimulatedDisconnect(): boolean {
    if (this.ws) {
      this.ws.close()
      return false
    } else if (this.activeBoardId) {
      this.connectWebSocket(this.activeBoardId)
      return true
    }
    return false
  }

  // --- Locks & Live Typing ---
  async acquireCardLock(boardId: string, cardId: string): Promise<boolean> {
    try {
      const res = await this.request<{ acquired: boolean; lock?: CardLock }>(
        `/boards/${boardId}/cards/${cardId}/lock`,
        { method: 'POST' }
      )
      return res.acquired
    } catch {
      return false
    }
  }

  async releaseCardLock(boardId: string, cardId: string): Promise<void> {
    try {
      await this.request<void>(`/boards/${boardId}/cards/${cardId}/lock`, {
        method: 'DELETE',
      })
    } catch {
      // ignore
    }
  }

  getCardLocks(boardId: string): CardLock[] {
    this.request<CardLock[]>(`/boards/${boardId}/locks`)
      .then((locks) => {
        this.cardLocksCache.set(boardId, locks)
      })
      .catch(() => {})
    return this.cardLocksCache.get(boardId) || []
  }

  sendLiveTyping(boardId: string, typing: LiveTypingEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentUser) {
      const msg: WebSocketMessage = {
        type: 'LIVE_TYPING',
        boardId,
        senderId: this.currentUser.id,
        payload: { typing },
        timestamp: Date.now(),
      }
      this.ws.send(JSON.stringify(msg))
    }
  }

  async triggerSimulatedPeerActivity(boardId: string): Promise<void> {
    // Switch to peer and stream typing over WebSocket
    const peer = this.getDemoUsers().find((u) => u.id !== this.currentUser?.id)
    if (!peer || !this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const card = { id: 'card-1', title: 'Design interactive landing page mockups' }

    // Send lock from peer
    const lockMsg: WebSocketMessage = {
      type: 'CARD_LOCKED',
      boardId,
      senderId: peer.id,
      payload: {
        lock: {
          cardId: card.id,
          userId: peer.id,
          userName: peer.name,
          userColor: peer.color,
          lockedAt: Date.now(),
        },
      },
      timestamp: Date.now(),
    }
    this.ws.send(JSON.stringify(lockMsg))

    // Stream live typing characters
    const textToAdd = ' [Live from FastAPI peer]'
    let text = card.title
    for (let i = 0; i < textToAdd.length; i++) {
      await new Promise((r) => setTimeout(r, 75))
      text += textToAdd[i]
      const typeMsg: WebSocketMessage = {
        type: 'LIVE_TYPING',
        boardId,
        senderId: peer.id,
        payload: {
          typing: {
            cardId: card.id,
            userId: peer.id,
            userName: peer.name,
            field: 'title',
            value: text,
          },
        },
        timestamp: Date.now(),
      }
      this.ws.send(JSON.stringify(typeMsg))
    }

    // Unlock card
    await new Promise((r) => setTimeout(r, 800))
    const unlockMsg: WebSocketMessage = {
      type: 'CARD_UNLOCKED',
      boardId,
      senderId: peer.id,
      payload: { cardId: card.id },
      timestamp: Date.now(),
    }
    this.ws.send(JSON.stringify(unlockMsg))
  }
}

export const backendKanbanService = new BackendKanbanService()
