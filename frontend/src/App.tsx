import React, { useState } from 'react'
import { BoardView } from './components/BoardView'
import { InviteModal } from './components/InviteModal'
import { Navbar } from './components/Navbar'
import { AuthProvider } from './context/AuthContext'
import { BoardProvider } from './context/BoardContext'

export const App: React.FC = () => {
  const [showInviteModal, setShowInviteModal] = useState(false)

  return (
    <AuthProvider>
      <BoardProvider boardId="board-demo-1">
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <Navbar onOpenInvite={() => setShowInviteModal(true)} />
          <BoardView />
          {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} />}
        </div>
      </BoardProvider>
    </AuthProvider>
  )
}

export default App
