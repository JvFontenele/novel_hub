import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { UserProfile } from '@novel-hub/contracts'

interface AuthContextValue {
  user: UserProfile | null
  token: string | null
  login: (user: UserProfile, token: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(getStoredUser)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  const login = useCallback((u: UserProfile, t: string) => {
    setUser(u)
    setToken(t)
    localStorage.setItem('user', JSON.stringify(u))
    localStorage.setItem('token', t)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
