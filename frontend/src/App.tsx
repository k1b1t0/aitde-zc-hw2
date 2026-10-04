import React, { useState } from 'react'
import { AuthModal } from './components/AuthModal'
import { BoardView } from './components/BoardView'
import { InviteModal } from './components/InviteModal'
import { Navbar } from './components/Navbar'
import { AuthProvider } from './context/AuthContext'
import { BoardProvider } from './context/BoardContext'

export const App: React.FC = () => {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Parse path for /join/:token or /boards/:boardId
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  const joinMatch = path.match(/\/join\/([a-zA-Z0-9_-]+)/)
  const initialJoinToken = joinMatch ? joinMatch[1] : undefined

  return (
    <AuthProvider>
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
    </AuthProvider>
  )
}

export default App
