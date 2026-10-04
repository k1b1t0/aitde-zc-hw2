import React, { useState } from 'react'
import { AuthModal } from './components/AuthModal'
import { BoardView } from './components/BoardView'
import { InviteModal } from './components/InviteModal'
import { Navbar } from './components/Navbar'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BoardProvider } from './context/BoardContext'

const MainAppContent: React.FC<{ initialJoinToken?: string }> = ({ initialJoinToken }) => {
  const { isLoading } = useAuth()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--accent-primary)',
          fontSize: '0.95rem',
          fontWeight: 700,
        }}
      >
        &gt; INITIALIZING_SESSION...<span className="cursor-blink">_</span>
      </div>
    )
  }

  return (
    <BoardProvider boardId="board-demo-1" initialJoinToken={initialJoinToken}>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <Navbar
          onOpenInvite={() => setShowInviteModal(true)}
          onOpenAuth={() => setShowAuthModal(true)}
        />
        <BoardView />
        {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} />}
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </div>
    </BoardProvider>
  )
}

export const App: React.FC = () => {
  // Parse path for /join/:token or /boards/:boardId
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  const joinMatch = path.match(/\/join\/([a-zA-Z0-9_-]+)/)
  const initialJoinToken = joinMatch ? joinMatch[1] : undefined

  return (
    <AuthProvider>
      <MainAppContent initialJoinToken={initialJoinToken} />
    </AuthProvider>
  )
}

export default App
