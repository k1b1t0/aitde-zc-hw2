import React, { useEffect, useState } from 'react'
import { Calendar, Check, Edit3, Lock, Tag, Trash2, User as UserIcon, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBoard } from '../context/BoardContext'
import type { Card, CardTag } from '../types'

interface CardModalProps {
  card: Card | null
  onClose: () => void
}

const AVAILABLE_TAGS: CardTag[] = ['feature', 'bug', 'urgent', 'design', 'docs']

export const CardModal: React.FC<CardModalProps> = ({ card, onClose }) => {
  const { currentUser } = useAuth()
  const {
    board,
    cardLocks,
    activeTyping,
    updateCard,
    deleteCard,
    acquireLock,
    releaseLock,
    sendTyping,
    sendTypingStopped,
  } = useBoard()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined)
  const [tags, setTags] = useState<CardTag[]>([])
  const [dueDate, setDueDate] = useState<string | undefined>(undefined)

  // Track if card was deleted while modal is open
  const cardStillExists = Boolean(card && board?.cards.some((c) => c.id === card.id))

  useEffect(() => {
    if (card && !cardStillExists) {
      onClose()
    }
  }, [card, cardStillExists, onClose])

  // Peer lock detection
  const currentLock = card ? cardLocks.find((l) => l.cardId === card.id) : null
  const isLockedByPeer = currentLock && currentLock.userId !== currentUser?.id
  const peerTyping = card ? activeTyping[card.id] : null
  const isPeerTyping = peerTyping && peerTyping.userId !== currentUser?.id

  // Synchronize state when card is opened or refreshed from board
  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description)
      setAssigneeId(card.assigneeId)
      setTags(card.tags || [])
      setDueDate(card.dueDate || '')

      acquireLock(card.id)
    }

    return () => {
      if (card) {
        sendTypingStopped(card.id)
        releaseLock(card.id)
      }
    }
  }, [card?.id])

  // If card props update from live WebSocket updates (e.g. peer changed tags, assignee, or dueDate)
  useEffect(() => {
    if (card) {
      setAssigneeId(card.assigneeId)
      setTags(card.tags || [])
      setDueDate(card.dueDate || '')
    }
  }, [card?.assigneeId, card?.dueDate, JSON.stringify(card?.tags)])

  // If peer is live typing on this card while modal is open, reflect streamed value
  useEffect(() => {
    if (isPeerTyping && peerTyping) {
      if (peerTyping.field === 'title') setTitle(peerTyping.value)
      if (peerTyping.field === 'description') setDescription(peerTyping.value)
    }
  }, [peerTyping?.value])

  if (!card || !cardStillExists) return null

  // Live Typing Handlers
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    sendTyping(card.id, 'title', newTitle)
  }

  const handleDescriptionChange = (newDesc: string) => {
    setDescription(newDesc)
    sendTyping(card.id, 'description', newDesc)
  }

  // Pure Exit / Cancel without saving
  const handleExitAndClose = () => {
    sendTypingStopped(card.id)
    releaseLock(card.id)
    onClose()
  }

  const handleSaveAndClose = async () => {
    sendTypingStopped(card.id)
    await updateCard(card.id, {
      title: title.trim() || card.title,
      description: description.trim(),
      assigneeId,
      tags,
      dueDate: dueDate || undefined,
    })
    releaseLock(card.id)
    onClose()
  }

  const toggleTag = (tag: CardTag) => {
    const updated = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    setTags(updated)
    updateCard(card.id, {
      title: title.trim() || card.title,
      description: description.trim(),
      tags: updated,
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={handleExitAndClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '2px solid var(--border-strong)',
          boxShadow: 'var(--shadow-modal)',
          width: '100%',
          maxWidth: '680px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Terminal Window Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 1rem',
            borderBottom: '2px solid var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>&gt;_</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              EDIT_RECORD // {card.id}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            {isLockedByPeer ? (
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--danger)',
                  fontWeight: 700,
                }}
              >
                [LOCKED: {currentLock.userName.toUpperCase()}]
              </span>
            ) : isPeerTyping ? (
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--accent-magenta)',
                  fontWeight: 700,
                }}
              >
                [{peerTyping.userName.toUpperCase()} TYPING...]
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--accent-primary)',
                  fontWeight: 700,
                }}
              >
                [LIVE_STREAM: ACTIVE]
              </span>
            )}

            <button
              onClick={handleExitAndClose}
              title="Close without saving"
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.15rem 0.4rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.35rem' }}>
              &gt; CARD_TITLE:
            </label>
            <input
              type="text"
              value={title}
              disabled={Boolean(isLockedByPeer)}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Record title..."
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                fontSize: '1rem',
                fontWeight: 700,
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.35rem' }}>
              &gt; DESCRIPTION_BODY:
            </label>
            <textarea
              value={description}
              disabled={Boolean(isLockedByPeer)}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={4}
              placeholder="Enter context..."
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                fontSize: '0.85rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {/* Assignee */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.35rem' }}>
                &gt; ASSIGNEE:
              </label>
              <select
                value={assigneeId || ''}
                disabled={Boolean(isLockedByPeer)}
                onChange={(e) => {
                  const val = e.target.value || undefined
                  setAssigneeId(val)
                  updateCard(card.id, {
                    title: title.trim() || card.title,
                    description: description.trim(),
                    assigneeId: val,
                  })
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                <option value="">NONE</option>
                {(() => {
                  const members = [...(board?.members || [])]
                  if (currentUser && !members.some((m) => m.id === currentUser.id)) {
                    members.push(currentUser)
                  }
                  return members.map((member) => (
                    <option key={member.id} value={member.id}>
                      @{member.name.toLowerCase()} {member.id === currentUser?.id ? '(YOU)' : ''}
                    </option>
                  ))
                })()}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.35rem' }}>
                &gt; DEADLINE:
              </label>
              <input
                type="date"
                value={dueDate || ''}
                disabled={Boolean(isLockedByPeer)}
                onChange={(e) => {
                  const val = e.target.value
                  setDueDate(val)
                  updateCard(card.id, {
                    title: title.trim() || card.title,
                    description: description.trim(),
                    dueDate: val || undefined,
                  })
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Color Tags */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.45rem' }}>
              &gt; LABELS:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {AVAILABLE_TAGS.map((tag) => {
                const isSelected = tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={Boolean(isLockedByPeer)}
                    onClick={() => toggleTag(tag)}
                    className={`tag-${tag}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      opacity: isSelected ? 1 : 0.35,
                      border: isSelected ? '1px solid currentColor' : '1px dashed var(--border-color)',
                      boxShadow: isSelected ? '2px 2px 0px #000' : 'none',
                    }}
                  >
                    [{tag.toUpperCase()}]
                    {isSelected && <Check size={12} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            borderTop: '2px solid var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)',
          }}
        >
          <button
            onClick={async () => {
              sendTypingStopped(card.id)
              releaseLock(card.id)
              await deleteCard(card.id)
              onClose()
            }}
            disabled={Boolean(isLockedByPeer)}
            className="retro-btn"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          >
            <Trash2 size={13} />
            <span>DROP_RECORD</span>
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              onClick={handleExitAndClose}
              className="retro-btn"
            >
              DISCARD_CHANGES
            </button>
            <button
              onClick={handleSaveAndClose}
              className="retro-btn retro-btn-primary"
            >
              WRITE_TO_DISK (SAVE)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
