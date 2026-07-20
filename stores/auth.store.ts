'use client'
import { create } from 'zustand'
import type { User, UserRole } from '@/types'

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData {
  name: string
  email: string
  password: string
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  role?: UserRole
}

interface AuthState {
  accessToken: string | null
  user: User | null
  role: UserRole | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  setAccessToken: (token: string) => void
  setUser: (user: User) => void
  hydrateSession: () => Promise<void>
}

async function postAuth(path: string, body: unknown): Promise<AuthTokens> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro inesperado' }))
    throw new Error(err.message ?? 'Erro inesperado')
  }
  return res.json()
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  role: null,
  isAuthenticated: false,

  login: async (credentials) => {
    const tokens = await postAuth('/api/auth/login', credentials)
    set({ accessToken: tokens.accessToken, isAuthenticated: true, role: tokens.role ?? null })
  },

  register: async (data) => {
    const tokens = await postAuth('/api/auth/register', data)
    set({ accessToken: tokens.accessToken, isAuthenticated: true, role: tokens.role ?? 'CUSTOMER' })
  },

  logout: () => {
    set({ accessToken: null, user: null, role: null, isAuthenticated: false })
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  },

  setAccessToken: (token) => set({ accessToken: token, isAuthenticated: true }),
  setUser: (user) => set({ user }),

  hydrateSession: async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      if (!res.ok) return
      const data = await res.json()
      set({ accessToken: data.accessToken, isAuthenticated: true, role: data.role ?? null })
    } catch { /* sem cookie de sessão — usuário permanece anônimo */ }
  },
}))
