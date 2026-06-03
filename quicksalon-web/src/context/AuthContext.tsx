import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, setToken } from '../lib/api'
import type { AuthProfile, LoginResponse } from '../types'

interface AuthState {
  token: string
  profile: AuthProfile | null
  fullName: string
  tenantName: string
  branchName: string
  roles: string[]
  isSuperAdmin: boolean
  hasAnyRole: (...requiredRoles: string[]) => boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokenValue, setTokenValue] = useState<string>(localStorage.getItem('qs_token') ?? '')
  const [profile, setProfile] = useState<AuthProfile | null>(() => {
    const raw = localStorage.getItem('qs_profile')
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthProfile
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (!tokenValue) return
    api<AuthProfile>('/api/auth/me').then((p) => {
      setProfile(p)
      localStorage.setItem('qs_profile', JSON.stringify(p))
    }).catch(() => {
      // Only sign out if there is no cached profile — a transient /me
      // failure (e.g. server restart) must not wipe a valid session.
      const cached = localStorage.getItem('qs_profile')
      if (!cached) {
        setToken('')
        setTokenValue('')
        setProfile(null)
      }
    })
  }, [tokenValue])

  const value = useMemo<AuthState>(() => ({
    token: tokenValue,
    profile,
    fullName: profile?.fullName ?? 'User',
    tenantName: profile?.tenantName ?? 'Salon Dashboard',
    branchName: profile?.branchName ?? 'Main Branch',
    roles: profile?.roles ?? [],
    isSuperAdmin: (profile?.roles ?? []).map(r => r.toLowerCase()).includes('systemadmin'),
    hasAnyRole: (...requiredRoles: string[]) => {
      const current = (profile?.roles ?? []).map((r) => r.toLowerCase())
      return requiredRoles.some((r) => current.includes(r.toLowerCase()))
    },
    async login(username: string, password: string) {
      const result = await api<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })

      setToken(result.token)
      setTokenValue(result.token)
      const p: AuthProfile = {
        userId: '',
        fullName: result.fullName,
        tenantId: result.tenantId,
        tenantName: result.tenantName,
        branchId: result.branchId,
        branchName: result.branchName,
        roles: result.roles,
      }
      setProfile(p)
      localStorage.setItem('qs_profile', JSON.stringify(p))

      try {
        const me = await api<AuthProfile>('/api/auth/me')
        setProfile(me)
        localStorage.setItem('qs_profile', JSON.stringify(me))
      } catch {
      }
    },
    logout() {
      setToken('')
      setTokenValue('')
      setProfile(null)
      localStorage.removeItem('qs_profile')
    },
  }), [profile, tokenValue])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
