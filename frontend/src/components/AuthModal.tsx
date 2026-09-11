import React, { useState } from 'react'
import { Check, KeyRound, Lock, LogIn, Mail, Sparkles, UserPlus, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import type { User } from '../types'

interface AuthModalProps {
  onClose: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { currentUser, demoUsers, login, switchUser } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Email address is required')
      return
    }

    setLoading(true)
    try {
      await login(email.trim().toLowerCase(), mode === 'signup' ? name.trim() : undefined)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectDemoUser = async (user: User) => {
    setError(null)
    setLoading(true)
    try {
      await switchUser(user.id)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to switch user account')
    } finally {
      setLoading(false)
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
          maxWidth: '520px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Terminal Header */}
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
              SYSTEM_AUTH // {mode.toUpperCase()}_GATEWAY
            </span>
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

        {/* Modal Content */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            <button
              onClick={() => {
                setMode('login')
                setError(null)
              }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderBottom: mode === 'login' ? '2px solid var(--accent-primary)' : 'none',
                backgroundColor: mode === 'login' ? 'var(--bg-tertiary)' : 'transparent',
                color: mode === 'login' ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
              }}
            >
              [SIGN_IN]
            </button>
            <button
              onClick={() => {
                setMode('signup')
                setError(null)
              }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderBottom: mode === 'signup' ? '2px solid var(--accent-cyan)' : 'none',
                backgroundColor: mode === 'signup' ? 'var(--bg-tertiary)' : 'transparent',
                color: mode === 'signup' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
              }}
            >
              [CREATE_ACCOUNT]
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: 'rgba(255, 51, 68, 0.15)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              [ERROR: {error}]
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.35rem' }}>
                  &gt; DISPLAY_NAME:
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.35rem' }}>
                &gt; EMAIL_ADDRESS:
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.35rem' }}>
                &gt; PASS_SECRET:
              </label>
              <input
                type="password"
                placeholder="password123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="retro-btn retro-btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.3rem', padding: '0.55rem' }}
            >
              {loading ? 'AUTHENTICATING...' : mode === 'login' ? 'AUTHORIZE_SESSION' : 'REGISTER_CREDENTIALS'}
            </button>
          </form>

          {/* Fast Demo Account Picker */}
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.8rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
              // QUICK TEST AS SEEDED DEMO ACCOUNT (password123):
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {demoUsers.map((u) => {
                const isActive = u.id === currentUser?.id
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectDemoUser(u)}
                    disabled={loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem',
                      border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
                      backgroundColor: isActive ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      textAlign: 'left',
                      fontFamily: 'var(--font-family)',
                    }}
                  >
                    <img
                      src={u.avatar}
                      alt={u.name}
                      style={{ width: '20px', height: '20px', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.name.split(' ')[0]}
                    </div>
                    {isActive && <Check size={12} color="var(--accent-primary)" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
