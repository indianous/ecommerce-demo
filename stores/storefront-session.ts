'use client'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/stores/auth.store'
import type { User, UserRole } from '@/types'

export interface StorefrontSession {
  isAuthenticated: boolean
  accessToken: string | null
  user: User | null
}

const ANONYMOUS: StorefrontSession = { isAuthenticated: false, accessToken: null, user: null }

interface SessionState {
  isAuthenticated: boolean
  accessToken: string | null
  user: User | null
  role: UserRole | null
}

/**
 * A sessão como a loja a enxerga: admin e funcionário navegam como visitante (plano 66, etapa 4). A sessão real
 * continua no useAuthStore para o painel, o login e o authFetch; só os componentes da loja passam por aqui.
 */
export function selectStorefrontSession(state: SessionState): StorefrontSession {
  if (state.role === 'ADMIN' || state.role === 'EMPLOYEE') return ANONYMOUS
  return { isAuthenticated: state.isAuthenticated, accessToken: state.accessToken, user: state.user }
}

export function useStorefrontSession(): StorefrontSession {
  return useAuthStore(useShallow(selectStorefrontSession))
}
