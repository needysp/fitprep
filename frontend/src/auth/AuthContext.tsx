import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, ApiError } from '../api/client'
import type { Me, Profile, User } from '../api/types'

interface AuthState {
  loading: boolean
  user: User | null
  profile: Profile | null
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<Me>('/api/auth/me')
      setUser(me.user)
      setProfile(me.profile)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null)
        setProfile(null)
      } else {
        throw err
      }
    }
  }, [])

  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refresh])

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout')
    setUser(null)
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{ loading, user, profile, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
