import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getKanbanService } from '../services'
import {
  Board,
  Card,
  CardLock,
  Column,
  ConnectionStatus,
  LiveTypingEvent,
  WebSocketMessage,
} from '../types'
import { useAuth } from './AuthContext'

interface BoardContextType {
  board: Board | null
  loading: boolean
  connectionStatus: ConnectionStatus
  cardLocks: CardLock[]
  activeTyping: Record<string, LiveTypingEvent> // cardId -> last live typing event
  createColumn: (title: string) => Promise<void>
  updateColumn: (columnId: string, title: string) => Promise<void>
  deleteColumn: (columnId: string) => Promise<void>
  reorderColumns: (columnIds: string[]) => Promise<void>
  createCard: (columnId: string, title: string, description?: string) => Promise<void>
  updateCard: (cardId: string, updates: Partial<Card>) => Promise<void>
  moveCard: (cardId: string, targetColumnId: string, newOrder: number) => Promise<void>
  deleteCard: (cardId: string) => Promise<void>
  acquireLock: (cardId: string) => Promise<boolean>
  releaseLock: (cardId: string) => Promise<void>
  sendTyping: (cardId: string, field: 'title' | 'description', value: string) => void
  toggleSimulatedDisconnect: () => void
  simulatePeerActivity: () => void
  refreshBoard: () => Promise<void>
}

const BoardContext = createContext<BoardContextType | undefined>(undefined)

export const BoardProvider: React.FC<{ boardId?: string; children: React.ReactNode }> = ({
  boardId = 'board-demo-1',
  children,
}) => {
  const { currentUser } = useAuth()
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected')
  const [cardLocks, setCardLocks] = useState<CardLock[]>([])
  const [activeTyping, setActiveTyping] = useState<Record<string, LiveTypingEvent>>({})

  const service = getKanbanService()

  const loadBoardData = useCallback(async () => {
    try {
      const data = await service.getBoard(boardId)
      setBoard(data)
      setCardLocks(service.getCardLocks(boardId))
    } catch (err) {
      console.error('Failed to load board:', err)
    } finally {
      setLoading(false)
    }
  }, [boardId, service])

  useEffect(() => {
    loadBoardData()

    // Listen to connection state changes
    setConnectionStatus(service.getConnectionStatus())
    const unsubConn = service.onConnectionStatusChange((status) => {
      setConnectionStatus(status)
    })

    // Listen to real-time websocket messages
    const unsubWs = service.subscribeToBoard(boardId, (msg: WebSocketMessage) => {
      switch (msg.type) {
        case 'CARD_CREATED':
          setBoard((prev) => {
            if (!prev) return prev
            if (prev.cards.some((c) => c.id === msg.payload.card.id)) return prev
            return { ...prev, cards: [...prev.cards, msg.payload.card] }
          })
          break

        case 'CARD_UPDATED':
          setBoard((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              cards: prev.cards.map((c) => (c.id === msg.payload.card.id ? msg.payload.card : c)),
            }
          })
          break

        case 'CARD_MOVED':
          setBoard((prev) => {
            if (!prev) return prev
            const { cardId, targetColumnId, newOrder } = msg.payload
            const card = prev.cards.find((c) => c.id === cardId)
            if (!card) return prev

            // Recalculate positions
            const remaining = prev.cards.filter((c) => c.id !== cardId)
            const updatedCard = { ...card, columnId: targetColumnId, order: newOrder }
            const colCards = remaining
              .filter((c) => c.columnId === targetColumnId)
              .sort((a, b) => a.order - b.order)

            colCards.splice(newOrder, 0, updatedCard)
            colCards.forEach((c, idx) => {
              c.order = idx
            })

            const otherColsCards = remaining.filter((c) => c.columnId !== targetColumnId)
            return { ...prev, cards: [...otherColsCards, ...colCards] }
          })
          break

        case 'CARD_DELETED':
          setBoard((prev) => {
            if (!prev) return prev
            return { ...prev, cards: prev.cards.filter((c) => c.id !== msg.payload.cardId) }
          })
          break

        case 'COLUMN_CREATED':
          setBoard((prev) => {
            if (!prev) return prev
            return { ...prev, columns: [...prev.columns, msg.payload.column] }
          })
          break

        case 'COLUMN_UPDATED':
          setBoard((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              columns: prev.columns.map((col) =>
                col.id === msg.payload.column.id ? msg.payload.column : col
              ),
            }
          })
          break

        case 'COLUMN_DELETED':
          setBoard((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              columns: prev.columns.filter((c) => c.id !== msg.payload.columnId),
              cards: prev.cards.filter((c) => c.columnId !== msg.payload.columnId),
            }
          })
          break

        case 'COLUMN_REORDERED':
          setBoard((prev) => {
            if (!prev) return prev
            const colMap = new Map(prev.columns.map((c) => [c.id, c]))
            const newCols: Column[] = []
            msg.payload.columnIds.forEach((id: string, idx: number) => {
              const c = colMap.get(id)
              if (c) newCols.push({ ...c, order: idx })
            })
            return { ...prev, columns: newCols }
          })
          break

        case 'CARD_LOCKED':
          setCardLocks((prev) => {
            const filtered = prev.filter((l) => l.cardId !== msg.payload.lock.cardId)
            return [...filtered, msg.payload.lock]
          })
          break

        case 'CARD_UNLOCKED':
          setCardLocks((prev) => prev.filter((l) => l.cardId !== msg.payload.cardId))
          setActiveTyping((prev) => {
            const copy = { ...prev }
            delete copy[msg.payload.cardId]
            return copy
          })
          break

        case 'LIVE_TYPING': {
          const typing: LiveTypingEvent = msg.payload.typing
          setActiveTyping((prev) => ({ ...prev, [typing.cardId]: typing }))
          // Also update card in local state if sender is peer
          if (currentUser && msg.senderId !== currentUser.id) {
            setBoard((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                cards: prev.cards.map((c) => {
                  if (c.id === typing.cardId) {
                    return {
                      ...c,
                      [typing.field]: typing.value,
                    }
                  }
                  return c
                }),
              }
            })
          }
          break
        }

        case 'USER_JOINED':
          setBoard((prev) => {
            if (!prev) return prev
            if (prev.members.some((m) => m.id === msg.payload.user.id)) return prev
            return { ...prev, members: [...prev.members, msg.payload.user] }
          })
          break

        default:
          break
      }
    })

    return () => {
      unsubConn()
      unsubWs()
    }
  }, [boardId, currentUser, loadBoardData, service])

  const createColumn = async (title: string) => {
    if (!board) return
    const col = await service.createColumn(board.id, title)
    setBoard((prev) => (prev ? { ...prev, columns: [...prev.columns, col] } : prev))
  }

  const updateColumn = async (columnId: string, title: string) => {
    const col = await service.updateColumn(columnId, title)
    setBoard((prev) =>
      prev ? { ...prev, columns: prev.columns.map((c) => (c.id === columnId ? col : c)) } : prev
    )
  }

  const deleteColumn = async (columnId: string) => {
    await service.deleteColumn(columnId)
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            columns: prev.columns.filter((c) => c.id !== columnId),
            cards: prev.cards.filter((c) => c.columnId !== columnId),
          }
        : prev
    )
  }

  const reorderColumns = async (columnIds: string[]) => {
    if (!board) return
    const cols = await service.reorderColumns(board.id, columnIds)
    setBoard((prev) => (prev ? { ...prev, columns: cols } : prev))
  }

  const createCard = async (columnId: string, title: string, description = '') => {
    if (!board) return
    const colCards = board.cards.filter((c) => c.columnId === columnId)
    const card = await service.createCard({
      columnId,
      title,
      description,
      tags: ['feature'],
      order: colCards.length,
      assigneeId: currentUser?.id,
    })
    setBoard((prev) => (prev ? { ...prev, cards: [...prev.cards, card] } : prev))
  }

  const updateCard = async (cardId: string, updates: Partial<Card>) => {
    const updated = await service.updateCard(cardId, updates)
    setBoard((prev) =>
      prev ? { ...prev, cards: prev.cards.map((c) => (c.id === cardId ? updated : c)) } : prev
    )
  }

  const moveCard = async (cardId: string, targetColumnId: string, newOrder: number) => {
    const updated = await service.moveCard(cardId, targetColumnId, newOrder)
    setBoard((prev) => {
      if (!prev) return prev
      const remaining = prev.cards.filter((c) => c.id !== cardId)
      const colCards = remaining
        .filter((c) => c.columnId === targetColumnId)
        .sort((a, b) => a.order - b.order)
      colCards.splice(newOrder, 0, updated)
      colCards.forEach((c, idx) => {
        c.order = idx
      })
      const otherCols = remaining.filter((c) => c.columnId !== targetColumnId)
      return { ...prev, cards: [...otherCols, ...colCards] }
    })
  }

  const deleteCard = async (cardId: string) => {
    await service.deleteCard(cardId)
    setBoard((prev) =>
      prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) } : prev
    )
  }

  const acquireLock = async (cardId: string): Promise<boolean> => {
    if (!board) return false
    return await service.acquireCardLock(board.id, cardId)
  }

  const releaseLock = async (cardId: string) => {
    if (!board) return
    await service.releaseCardLock(board.id, cardId)
  }

  const sendTyping = (cardId: string, field: 'title' | 'description', value: string) => {
    if (!board || !currentUser) return
    service.sendLiveTyping(board.id, {
      cardId,
      userId: currentUser.id,
      userName: currentUser.name,
      field,
      value,
    })
  }

  const toggleSimulatedDisconnect = () => {
    service.toggleSimulatedDisconnect()
  }

  const simulatePeerActivity = () => {
    if (!board) return
    service.triggerSimulatedPeerActivity(board.id)
  }

  return (
    <BoardContext.Provider
      value={{
        board,
        loading,
        connectionStatus,
        cardLocks,
        activeTyping,
        createColumn,
        updateColumn,
        deleteColumn,
        reorderColumns,
        createCard,
        updateCard,
        moveCard,
        deleteCard,
        acquireLock,
        releaseLock,
        sendTyping,
        toggleSimulatedDisconnect,
        simulatePeerActivity,
        refreshBoard: loadBoardData,
      }}
    >
      {children}
    </BoardContext.Provider>
  )
}

export const useBoard = () => {
  const context = useContext(BoardContext)
  if (!context) throw new Error('useBoard must be used within a BoardProvider')
  return context
}
