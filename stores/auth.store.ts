'use client'
import { create } from 'zustand'
import type { User } from '@/types'

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
}

interface AuthState {
  accessToken: string | null
  user: User | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  setAccessToken: (token: string) => void
  setUser: (user: User) => void
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
  isAuthenticated: false,

  login: async (credentials) => {
    const tokens = await postAuth('/api/auth/login', credentials)
    // accessToken kept only in memory — never localStorage
    set({ accessToken: tokens.accessToken, isAuthenticated: true })
  },

  register: async (data) => {
    const tokens = await postAuth('/api/auth/register', data)
    set({ accessToken: tokens.accessToken, isAuthenticated: true })
  },

  logout: () => {
    set({ accessToken: null, user: null, isAuthenticated: false })
    // Fire-and-forget: tell BFF to clear the HttpOnly refresh cookie
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  },

  setAccessToken: (token) => set({ accessToken: token, isAuthenticated: true }),
  setUser: (user) => set({ user }),
}))
