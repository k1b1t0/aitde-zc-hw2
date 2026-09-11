import React, { createContext, useContext, useEffect, useState } from 'react'
import { getKanbanService } from '../services'
import { User } from '../types'

interface AuthContextType {
  currentUser: User | null
  demoUsers: User[]
  login: (email: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  switchUser: (userId: string) => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [demoUsers, setDemoUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const service = getKanbanService()

  useEffect(() => {
    setDemoUsers(service.getDemoUsers())
    service.getCurrentUser().then((user) => {
      setCurrentUser(user)
      setIsLoading(false)
    })
  }, [])

  const login = async (email: string, name?: string) => {
    const user = await service.login(email, name)
    setCurrentUser(user)
  }

  const logout = async () => {
    await service.logout()
    const user = await service.getCurrentUser()
    setCurrentUser(user)
  }

  const switchUser = async (userId: string) => {
    const user = await service.switchUser(userId)
    setCurrentUser(user)
  }

  return (
    <AuthContext.Provider value={{ currentUser, demoUsers, login, logout, switchUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
