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
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
  landingPage?: string
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
  markEmailVerified: () => void
  markEmailUnverified: () => void
  hydrateSession: () => Promise<void>
  refreshAccessToken: () => Promise<string | null>
}

/** Erro do login/cadastro com o status e o {@code code} do backend (ex.: PASSWORD_NOT_SET). */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

async function postAuth(path: string, body: unknown): Promise<AuthTokens> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro inesperado' }))
    throw new AuthError(err.message ?? 'Erro inesperado', res.status, err.code ?? undefined)
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

// Refresh em andamento, compartilhado por hydrateSession e authFetch: o mesmo refresh token
// nunca sai em duas requisições paralelas (plano #59).
let pendingRefresh: Promise<string | null> | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
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
  markEmailVerified: () => set((s) => (s.user ? { user: { ...s.user, emailVerified: true } } : {})),
  markEmailUnverified: () => set((s) => (s.user ? { user: { ...s.user, emailVerified: false } } : {})),

  hydrateSession: async () => {
    const token = await get().refreshAccessToken()
    if (!token) return
    const user = await fetchMe(token)
    set({ user })
  },

  refreshAccessToken: () => {
    if (pendingRefresh) return pendingRefresh

    const clear = () => set({ accessToken: null, user: null, role: null, isAuthenticated: false })
    pendingRefresh = fetch('/api/auth/refresh', { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) {
          clear()
          return null
        }
        const data = await res.json()
        set({ accessToken: data.accessToken, isAuthenticated: true, role: data.role ?? null })
        return data.accessToken as string
      })
      .catch(() => {
        clear()
        return null
      })
      .finally(() => {
        pendingRefresh = null
      })
    return pendingRefresh
  },
}))
