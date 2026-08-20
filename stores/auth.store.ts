'use client'
import { create } from 'zustand'
import type { Gender, User, UserRole } from '@/types'

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData {
  name: string
  email: string
  password: string
  phone?: string
  birthDate?: string
  gender?: Gender
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

async function fetchMe(accessToken: string): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function mergeCartOnLogin(): Promise<void> {
  try {
    const { useCartStore } = await import('@/stores/cart.store')
    await useCartStore.getState().mergeOnLogin()
  } catch {
    // carrinho local não foi mesclado — não impede o login
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  role: null,
  isAuthenticated: false,

  login: async (credentials) => {
    const tokens = await postAuth('/api/auth/login', credentials)
    const user = await fetchMe(tokens.accessToken)
    set({ accessToken: tokens.accessToken, isAuthenticated: true, role: tokens.role ?? null, user })
    void mergeCartOnLogin()
  },

  register: async (data) => {
    const tokens = await postAuth('/api/auth/register', data)
    const user = await fetchMe(tokens.accessToken)
    set({ accessToken: tokens.accessToken, isAuthenticated: true, role: tokens.role ?? 'CUSTOMER', user })
    void mergeCartOnLogin()
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
      const user = await fetchMe(data.accessToken)
      set({ accessToken: data.accessToken, isAuthenticated: true, role: data.role ?? null, user })
    } catch { /* sem cookie de sessão — usuário permanece anônimo */ }
  },
}))
