import React, { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { useBoard } from '../context/BoardContext'
import type { Card, Column } from '../types'
import { CardComponent } from './CardComponent'

interface ColumnProps {
  column: Column
  cards: Card[]
  onEditCard: (card: Card) => void
}

export const ColumnComponent: React.FC<ColumnProps> = ({ column, cards, onEditCard }) => {
  const { createCard, moveCard, updateColumn, deleteColumn } = useBoard()
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [columnTitle, setColumnTitle] = useState(column.title)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCardTitle.trim()) return
    await createCard(column.id, newCardTitle.trim())
    setNewCardTitle('')
    setIsAddingCard(false)
  }

  const handleTitleSubmit = async () => {
    if (columnTitle.trim() && columnTitle !== column.title) {
      await updateColumn(column.id, columnTitle.trim())
    }
    setIsEditingTitle(false)
  }

  // HTML5 Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const cardId = e.dataTransfer.getData('text/plain')
    if (!cardId) return

    const targetOrder = cards.length
    await moveCard(cardId, column.id, targetOrder)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '320px',
        minWidth: '320px',
        maxHeight: 'calc(100vh - 120px)',
        backgroundColor: isDragOver ? '#131b26' : 'var(--bg-secondary)',
        border: `2px solid ${isDragOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
        boxShadow: 'var(--shadow-column)',
        padding: '0.85rem',
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
    >
      {/* 90s GUI / Terminal Window Title Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem',
          padding: '0.4rem 0.5rem',
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-strong)',
          boxShadow: '1px 1px 0px #000',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 800 }}>&gt;</span>
          {isEditingTitle ? (
            <input
              type="text"
              value={columnTitle}
              onChange={(e) => setColumnTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '0.2rem 0.4rem',
                width: '100%',
                outline: 'none',
              }}
            />
          ) : (
            <h3
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename column"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              {column.title}
            </h3>
          )}
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.1rem 0.4rem',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--accent-cyan)',
              border: '1px solid var(--border-color)',
            }}
          >
            [{cards.length}]
          </span>
        </div>

        <button
          onClick={() => deleteColumn(column.id)}
          title="Delete Column"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.2rem',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Cards Scrollable Canvas */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: '80px',
          padding: '0.2rem 0.35rem 0.2rem 0.1rem',
        }}
      >
        {cards
          .sort((a, b) => a.order - b.order)
          .map((card) => (
            <CardComponent key={card.id} card={card} onEdit={onEditCard} />
          ))}

        {cards.length === 0 && !isAddingCard && (
          <div
            style={{
              padding: '2rem 0.5rem',
              textAlign: 'center',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              fontStyle: 'italic',
            }}
          >
            [-- NO ITEMS: DROP HERE --]
          </div>
        )}
      </div>

      {/* Add Card Footer */}
      <div style={{ marginTop: '0.65rem' }}>
        {isAddingCard ? (
          <form onSubmit={handleAddCardSubmit} style={{ border: '1px solid var(--border-strong)', padding: '0.5rem', backgroundColor: 'var(--bg-primary)' }}>
            <textarea
              placeholder="task_name..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              autoFocus
              rows={2}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                padding: '0.45rem',
                fontSize: '0.8rem',
                outline: 'none',
                resize: 'none',
                marginBottom: '0.4rem',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddCardSubmit(e)
                }
              }}
            />
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="submit"
                className="retro-btn retro-btn-primary"
                style={{ flex: 1, padding: '0.35rem' }}
              >
                + APPEND
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCard(false)}
                className="retro-btn"
                style={{ padding: '0.35rem 0.6rem' }}
              >
                <X size={14} />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className="retro-btn"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Plus size={13} />
            <span>NEW CARD</span>
          </button>
        )}
      </div>
    </div>
  )
}
