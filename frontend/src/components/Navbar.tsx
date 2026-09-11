import React, { useState } from 'react'
import {
  Check,
  ChevronDown,
  Link,
  LogIn,
  LogOut,
  Terminal,
  UserCheck,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBoard } from '../context/BoardContext'

interface NavbarProps {
  onOpenInvite: () => void
  onOpenAuth: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenInvite, onOpenAuth }) => {
  const { currentUser, demoUsers, switchUser, logout } = useAuth()
  const {
    board,
    connectionStatus,
    toggleSimulatedDisconnect,
  } = useBoard()
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  const isConnected = connectionStatus === 'connected'
  const isConnecting = connectionStatus === 'connecting'

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.65rem 1.25rem',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '2px solid var(--border-color)',
        boxShadow: '0 4px 0px #000',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand & Board Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              padding: '4px 6px',
              backgroundColor: '#000',
              border: '2px solid var(--accent-primary)',
              boxShadow: '2px 2px 0px var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <Terminal size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <h1 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--accent-primary)' }}>
                MINI_KANBAN.v1
              </h1>
              <span style={{ fontSize: '0.65rem', color: '#000', backgroundColor: 'var(--accent-primary)', padding: '1px 4px', fontWeight: 800 }}>
                TTY
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>// WS_REALTIME_SYNC</span>
          </div>
        </div>

        <div style={{ width: '2px', height: '24px', backgroundColor: 'var(--border-strong)' }} />

        {/* Current Board Title & Presence Avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            /{board?.title || 'LOADING_BOARD'}
          </span>

          {/* Active Members */}
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.5rem' }}>
            {board?.members.map((member, i) => (
              <div
                key={member.id}
                title={`${member.name} (${member.id === currentUser?.id ? 'YOU' : 'ONLINE'})`}
                style={{
                  width: '26px',
                  height: '26px',
                  border: `2px solid ${member.id === currentUser?.id ? 'var(--accent-primary)' : '#000'}`,
                  marginLeft: i === 0 ? 0 : '-6px',
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: '#000',
                  boxShadow: '1px 1px 0px #000',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={member.avatar}
                  alt={member.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Invite Link Button */}
        <button
          onClick={onOpenInvite}
          className="retro-btn"
        >
          <Link size={13} />
          <span>INVITE_LINK</span>
        </button>

        {/* WebSocket Connection Status */}
        <button
          onClick={toggleSimulatedDisconnect}
          title="Click to toggle network drop / test auto-reconnect"
          className="retro-btn"
          style={{
            borderColor: isConnected ? 'var(--accent-primary)' : isConnecting ? 'var(--warning)' : 'var(--danger)',
            color: isConnected ? 'var(--accent-primary)' : isConnecting ? 'var(--warning)' : 'var(--danger)',
          }}
        >
          {isConnected ? (
            <>
              <Wifi size={13} />
              <span>WS:CONNECTED</span>
            </>
          ) : isConnecting ? (
            <>
              <Wifi size={13} />
              <span>WS:RETRYING...</span>
            </>
          ) : (
            <>
              <WifiOff size={13} />
              <span>WS:DISCONNECTED</span>
            </>
          )}
        </button>

        {/* Current User Switcher Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="retro-btn"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                overflow: 'hidden',
                border: '1px solid var(--border-strong)',
              }}
            >
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span>@{currentUser?.name.split(' ')[0].toLowerCase()}</span>
            <ChevronDown size={13} color="var(--text-muted)" />
          </button>

          {showUserDropdown && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '230px',
                backgroundColor: 'var(--bg-secondary)',
                border: '2px solid var(--border-color)',
                boxShadow: 'var(--shadow-modal)',
                padding: '0.5rem',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: '0.4rem',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                // SWITCH COLLABORATOR:
              </div>
              {demoUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    switchUser(user.id)
                    setShowUserDropdown(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.4rem 0.5rem',
                    border: '1px solid transparent',
                    backgroundColor: user.id === currentUser?.id ? 'var(--bg-tertiary)' : 'transparent',
                    color: user.id === currentUser?.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-family)',
                    fontSize: '0.78rem',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-strong)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                      src={user.avatar}
                      alt={user.name}
                      style={{ width: '20px', height: '20px', objectFit: 'cover' }}
                    />
                    <span>{user.name}</span>
                  </div>
                  {user.id === currentUser?.id && <Check size={14} color="var(--accent-primary)" />}
                </button>
              ))}

              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.4rem', paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <button
                  onClick={() => {
                    setShowUserDropdown(false)
                    onOpenAuth()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.5rem',
                    backgroundColor: 'transparent',
                    border: '1px dashed var(--accent-cyan)',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-family)',
                  }}
                >
                  <LogIn size={13} />
                  <span>LOGIN / SIGN_UP</span>
                </button>

                <button
                  onClick={async () => {
                    setShowUserDropdown(false)
                    await logout()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.5rem',
                    backgroundColor: 'transparent',
                    border: '1px dashed var(--danger)',
                    color: 'var(--danger)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-family)',
                  }}
                >
                  <LogOut size={13} />
                  <span>LOGOUT_SESSION</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
