import React, { useState } from 'react'
import { Calendar, Edit3, Lock, Trash2, User as UserIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBoard } from '../context/BoardContext'
import type { Card } from '../types'

interface CardProps {
  card: Card
  onEdit: (card: Card) => void
}

export const CardComponent: React.FC<CardProps> = ({ card, onEdit }) => {
  const { currentUser } = useAuth()
  const { board, cardLocks, activeTyping, deleteCard } = useBoard()
  const [isHovered, setIsHovered] = useState(false)

  // Find if locked by someone else
  const currentLock = cardLocks.find((l) => l.cardId === card.id)
  const isLockedByPeer = currentLock && currentLock.userId !== currentUser?.id
  const isLockedByMe = currentLock && currentLock.userId === currentUser?.id

  // Find if peer is live typing right now
  const peerTyping = activeTyping[card.id]
  const isPeerTyping = peerTyping && peerTyping.userId !== currentUser?.id

  // Find assignee
  const assignee = board?.members.find((m) => m.id === card.assigneeId)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', card.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable={!isLockedByPeer}
      onDragStart={handleDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onEdit(card)}
      style={{
        backgroundColor: isHovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem',
        marginBottom: '0.9rem',
        /* High-contrast retro pop-out hard border and 3D offset shadow */
        border: `2px solid ${
          isPeerTyping
            ? 'var(--accent-magenta)'
            : isLockedByPeer
            ? 'var(--danger)'
            : isLockedByMe
            ? 'var(--accent-primary)'
            : isHovered
            ? 'var(--accent-cyan)'
            : 'var(--border-strong)'
        }`,
        boxShadow: isHovered
          ? 'var(--shadow-pop-hover)'
          : isLockedByPeer
          ? '2px 2px 0px #000'
          : 'var(--shadow-pop)',
        transform: isHovered ? 'translate(-2px, -2px)' : 'none',
        cursor: isLockedByPeer ? 'not-allowed' : 'grab',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease',
        position: 'relative',
      }}
    >
      {/* 90s terminal card header indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          marginBottom: '0.45rem',
          fontFamily: 'var(--font-family)',
          borderBottom: '1px dashed rgba(255, 255, 255, 0.08)',
          paddingBottom: '0.25rem',
        }}
      >
        <span>#CARD_{card.id.slice(-6).toUpperCase()}</span>
        <span>::{card.order}</span>
      </div>

      {/* Live Conflict / Editing Lock Banner */}
      {isLockedByPeer && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.5rem',
            marginBottom: '0.5rem',
            backgroundColor: 'rgba(255, 51, 68, 0.15)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          <Lock size={12} />
          <span>[LOCKED BY {currentLock.userName.toUpperCase()}]</span>
        </div>
      )}

      {/* Live Typing Stream Indicator (Google Docs style) */}
      {isPeerTyping && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.5rem',
            marginBottom: '0.5rem',
            backgroundColor: 'rgba(255, 0, 127, 0.15)',
            border: '1px solid var(--accent-magenta)',
            color: 'var(--accent-magenta)',
            fontSize: '0.72rem',
            fontWeight: 700,
          }}
        >
          <Edit3 size={12} />
          <span>&gt; {peerTyping.userName} is typing<span className="cursor-blink">_</span></span>
        </div>
      )}

      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.55rem' }}>
          {card.tags.map((tag) => (
            <span
              key={tag}
              className={`tag-${tag}`}
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '0.15rem 0.45rem',
                boxShadow: '1px 1px 0px #000',
              }}
            >
              [{tag}]
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h4
        style={{
          fontSize: '0.88rem',
          fontWeight: 700,
          lineHeight: '1.4',
          color: 'var(--text-primary)',
          marginBottom: card.description ? '0.35rem' : '0.65rem',
          letterSpacing: '-0.02em',
        }}
      >
        {card.title}
      </h4>

      {/* Description Snippet */}
      {card.description && (
        <p
          style={{
            fontSize: '0.76rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.45',
            marginBottom: '0.75rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {card.description}
        </p>
      )}

      {/* Card Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.5rem',
          paddingTop: '0.45rem',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {card.dueDate && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.7rem',
                color: 'var(--accent-amber)',
                fontWeight: 600,
              }}
            >
              <Calendar size={12} />
              <span>{card.dueDate}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {/* Quick delete button */}
          {isHovered && !isLockedByPeer && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteCard(card.id)
              }}
              title="Delete Card"
              style={{
                background: 'none',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                cursor: 'pointer',
                padding: '0.2rem 0.35rem',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 51, 68, 0.1)',
              }}
            >
              <Trash2 size={12} />
            </button>
          )}

          {/* Assignee Avatar */}
          {assignee ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                border: '1px solid var(--border-strong)',
                padding: '1px 4px',
                backgroundColor: 'var(--bg-primary)',
              }}
            >
              <img
                src={assignee.avatar}
                alt={assignee.name}
                title={`Assigned to ${assignee.name}`}
                style={{
                  width: '18px',
                  height: '18px',
                  objectFit: 'cover',
                }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                {assignee.name.split(' ')[0]}
              </span>
            </div>
          ) : (
            <div
              title="Unassigned"
              style={{
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                border: '1px dashed var(--text-muted)',
                padding: '1px 4px',
              }}
            >
              none
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
