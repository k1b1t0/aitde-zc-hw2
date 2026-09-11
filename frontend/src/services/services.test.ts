import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockKanbanService } from './mockService'

describe('MockKanbanService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return initial current user', async () => {
    const user = await mockKanbanService.getCurrentUser()
    expect(user).toBeDefined()
    expect(user?.name).toBe('Alex Morgan')
  })

  it('should switch user and return new user profile', async () => {
    const user = await mockKanbanService.switchUser('user-2')
    expect(user.id).toBe('user-2')
    expect(user.name).toBe('Sarah Chen')

    const current = await mockKanbanService.getCurrentUser()
    expect(current?.id).toBe('user-2')
  })

  it('should retrieve board with columns and cards', async () => {
    const board = await mockKanbanService.getBoard('board-demo-1')
    expect(board).toBeDefined()
    expect(board.title).toBe('Team Product Launch')
    expect(board.columns.length).toBeGreaterThan(0)
    expect(board.cards.length).toBeGreaterThan(0)
  })

  it('should create and delete a column', async () => {
    const col = await mockKanbanService.createColumn('board-demo-1', 'QA Testing')
    expect(col.title).toBe('QA Testing')

    const board = await mockKanbanService.getBoard('board-demo-1')
    expect(board.columns.some((c) => c.id === col.id)).toBe(true)

    await mockKanbanService.deleteColumn(col.id)
    const boardAfter = await mockKanbanService.getBoard('board-demo-1')
    expect(boardAfter.columns.some((c) => c.id === col.id)).toBe(false)
  })

  it('should create, move, and update cards with Last-Write-Wins', async () => {
    const newCard = await mockKanbanService.createCard({
      columnId: 'col-1',
      title: 'Automated test card',
      description: 'Verifying movement and updates',
      tags: ['bug'],
      order: 99,
    })

    expect(newCard.id).toBeDefined()
    expect(newCard.title).toBe('Automated test card')

    // Update card
    const updated = await mockKanbanService.updateCard(newCard.id, {
      title: 'Updated title',
    })
    expect(updated.title).toBe('Updated title')

    // Move card to col-2
    const moved = await mockKanbanService.moveCard(newCard.id, 'col-2', 0)
    expect(moved.columnId).toBe('col-2')
    expect(moved.order).toBe(0)
  })

  it('should handle card locks and release locks', async () => {
    const acquired = await mockKanbanService.acquireCardLock('board-demo-1', 'card-1')
    expect(acquired).toBe(true)

    const locks = mockKanbanService.getCardLocks('board-demo-1')
    expect(locks.some((l) => l.cardId === 'card-1')).toBe(true)

    await mockKanbanService.releaseCardLock('board-demo-1', 'card-1')
    const locksAfter = mockKanbanService.getCardLocks('board-demo-1')
    expect(locksAfter.some((l) => l.cardId === 'card-1')).toBe(false)
  })

  it('should broadcast WebSocket messages to subscribers', async () => {
    const subscriber = vi.fn()
    const unsubscribe = mockKanbanService.subscribeToBoard('board-demo-1', subscriber)

    // Trigger an action that broadcasts
    await mockKanbanService.createColumn('board-demo-1', 'Websocket Test Col')
    expect(subscriber).toHaveBeenCalled()
    expect(subscriber.mock.calls[0][0].type).toBe('COLUMN_CREATED')

    unsubscribe()
  })

  it('should support toggling network disconnect / auto-reconnect', () => {
    const status = mockKanbanService.getConnectionStatus()
    expect(status).toBe('connected')

    const disconnectResult = mockKanbanService.toggleSimulatedDisconnect(true)
    expect(disconnectResult).toBe(false)
    expect(mockKanbanService.getConnectionStatus()).toBe('disconnected')

    // Reset back
    mockKanbanService.toggleSimulatedDisconnect(false)
    expect(mockKanbanService.getConnectionStatus()).toBe('connected')
  })
})
