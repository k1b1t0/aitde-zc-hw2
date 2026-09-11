import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { useBoard } from '../context/BoardContext'
import type { Card } from '../types'
import { CardModal } from './CardModal'
import { ColumnComponent } from './ColumnComponent'

export const BoardView: React.FC = () => {
  const { board, loading, createColumn } = useBoard()
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')

  const handleAddColumnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColumnTitle.trim()) return
    await createColumn(newColumnTitle.trim())
    setNewColumnTitle('')
    setIsAddingColumn(false)
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 70px)',
          color: 'var(--accent-primary)',
          fontSize: '0.95rem',
          fontWeight: 700,
        }}
      >
        &gt; LOADING WORKSPACE DATA...<span className="cursor-blink">_</span>
      </div>
    )
  }

  if (!board) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 70px)',
          color: 'var(--danger)',
        }}
      >
        [ERROR: BOARD RECORD NOT FOUND]
      </div>
    )
  }

  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1.5rem',
        padding: '1.5rem',
        overflowX: 'auto',
        minHeight: 'calc(100vh - 70px)',
      }}
    >
      {/* Render Columns */}
      {board.columns
        .sort((a, b) => a.order - b.order)
        .map((col) => (
          <ColumnComponent
            key={col.id}
            column={col}
            cards={board.cards.filter((c) => c.columnId === col.id)}
            onEditCard={(card) => setSelectedCard(card)}
          />
        ))}

      {/* Add New Column Section */}
      <div style={{ width: '280px', minWidth: '280px' }}>
        {isAddingColumn ? (
          <form
            onSubmit={handleAddColumnSubmit}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '2px solid var(--border-color)',
              boxShadow: 'var(--shadow-column)',
              padding: '0.85rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.4rem' }}>
              &gt; NEW_COLUMN:
            </div>
            <input
              type="text"
              placeholder="column_title..."
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '0.45rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                fontSize: '0.82rem',
                outline: 'none',
                marginBottom: '0.5rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="submit"
                className="retro-btn retro-btn-primary"
                style={{ flex: 1, padding: '0.35rem' }}
              >
                CREATE
              </button>
              <button
                type="button"
                onClick={() => setIsAddingColumn(false)}
                className="retro-btn"
                style={{ padding: '0.35rem 0.6rem' }}
              >
                CANCEL
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingColumn(true)}
            className="retro-btn"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.85rem 1rem',
              borderStyle: 'dashed',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
            }}
          >
            <Plus size={15} />
            <span>ADD COLUMN</span>
          </button>
        )}
      </div>

      {/* Card Detail / Live Editing Modal */}
      {selectedCard && (
        <CardModal
          card={board.cards.find((c) => c.id === selectedCard.id) || selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </main>
  )
}
