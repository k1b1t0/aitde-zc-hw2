import React, { useState } from 'react'
import { Check, Copy, Link as LinkIcon, Terminal, X } from 'lucide-react'
import { useBoard } from '../context/BoardContext'

interface InviteModalProps {
  onClose: () => void
}

export const InviteModal: React.FC<InviteModalProps> = ({ onClose }) => {
  const { board } = useBoard()
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  const inviteUrl = board ? `${origin}/join/${board.inviteToken}` : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(true)
    }
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
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '2px solid var(--border-strong)',
          boxShadow: 'var(--shadow-modal)',
          width: '100%',
          maxWidth: '540px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderBottom: '2px solid var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Terminal size={16} color="var(--accent-primary)" />
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                GENERATE_INVITE_TOKEN
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
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

        {/* Content */}
        <div style={{ padding: '1.25rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--accent-cyan)',
              marginBottom: '0.4rem',
            }}
          >
            &gt; PUBLIC_ACCESS_ENDPOINT:
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-strong)',
              padding: '0.4rem 0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <LinkIcon size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '0.3rem' }} />
            <input
              type="text"
              readOnly
              value={inviteUrl}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                fontFamily: 'var(--font-family)',
              }}
            />
            <button
              onClick={handleCopy}
              className={`retro-btn ${copied ? '' : 'retro-btn-primary'}`}
              style={{ padding: '0.35rem 0.65rem' }}
            >
              {copied ? (
                <>
                  <Check size={12} />
                  <span>COPIED!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>COPY</span>
                </>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              // REGISTERED_PEERS [{board?.members.length}]:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '160px', overflowY: 'auto' }}>
              {board?.members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.6rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                      src={member.avatar}
                      alt={member.name}
                      style={{ width: '22px', height: '22px', objectFit: 'cover' }}
                    />
                    <div>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {member.name}
                      </p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: 'var(--accent-cyan)',
                      border: '1px solid var(--accent-cyan)',
                      padding: '1px 5px',
                    }}
                  >
                    PEER_EQUAL
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '0.75rem 1rem',
            borderTop: '2px solid var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)',
          }}
        >
          <button
            onClick={onClose}
            className="retro-btn"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  )
}
