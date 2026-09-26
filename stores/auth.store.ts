'use client'
import { create } from 'zustand'
import type { Gender, LoginResult, MfaSetupInfo, User, UserRole } from '@/types'

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

/** Resposta do login: sessão, ou o mfaToken da segunda etapa (plano 65). */
interface LoginResponse extends Partial<AuthTokens> {
  mfaRequired?: boolean
  mfaSetupRequired?: boolean
  mfaToken?: string
}

interface MfaSession {
  accessToken: string
  role?: UserRole
  recoveryCodesRemaining?: number
  recoveryCodes?: string[]
}

interface AuthState {
  accessToken: string | null
  user: User | null
  role: UserRole | null
  isAuthenticated: boolean
  /** Token da segunda etapa do login. Só em memória: nunca vai para storage nem para a URL. */
  mfaToken: string | null
  login: (credentials: LoginCredentials) => Promise<LoginResult>
  verifyMfa: (code: string) => Promise<{ recoveryCodesRemaining?: number }>
  verifyRecoveryCode: (code: string) => Promise<{ recoveryCodesRemaining?: number }>
  startMfaSetup: () => Promise<MfaSetupInfo>
  confirmMfaSetup: (code: string) => Promise<string[]>
  acknowledgeRecoveryCodes: () => Promise<void>
  cancelMfa: () => void
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  setAccessToken: (token: string) => void
  setUser: (user: User) => void
  markEmailVerified: () => void
  markEmailUnverified: () => void
  hydrateSession: () => Promise<void>
  refreshAccessToken: () => Promise<string | null>
}

/**
 * Erro do login/cadastro com o status e o {@code code} do backend (ex.: PASSWORD_NOT_SET). No código do 2FA
 * errado, {@code attemptsRemaining} diz quantas tentativas restam no mfaToken.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly attemptsRemaining?: number,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

const MFA_EXPIRED_MESSAGE = 'Sua sessão de login expirou, entre de novo'

async function postAuth<T = AuthTokens>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro inesperado' }))
    throw new AuthError(err.message ?? 'Erro inesperado', res.status, err.code ?? undefined, err.attemptsRemaining ?? undefined)
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

/** Sessão completa: token em memória, usuário, carrinho mesclado e fim da segunda etapa. */
async function openSession(session: { accessToken: string; role?: UserRole | null }): Promise<void> {
  const user = await fetchMe(session.accessToken)
  useAuthStore.setState({
    accessToken: session.accessToken,
    isAuthenticated: true,
    role: session.role ?? null,
    user,
    mfaToken: null,
  })
  void mergeCartOnLogin()
}

/** 410: o mfaToken venceu, foi usado ou esgotou as tentativas — volta para a senha. */
function expireOnGone(err: unknown): unknown {
  if (err instanceof AuthError && err.status === 410) {
    pendingSession = null
    useAuthStore.setState({ mfaToken: null })
    return new AuthError(MFA_EXPIRED_MESSAGE, 410, err.code)
  }
  return err
}

async function verifySecondFactor(
  factor: { code: string } | { recoveryCode: string },
): Promise<{ recoveryCodesRemaining?: number }> {
  try {
    const session: MfaSession = await postAuth<MfaSession>('/api/auth/mfa/verify', {
      mfaToken: useAuthStore.getState().mfaToken,
      ...factor,
    })
    await openSession(session)
    return { recoveryCodesRemaining: session.recoveryCodesRemaining }
  } catch (err) {
    throw expireOnGone(err)
  }
}

// Sessão emitida no fim da configuração do 2FA: só vira login depois que a pessoa guardou os códigos de recuperação.
let pendingSession: MfaSession | null = null

// Refresh em andamento, compartilhado por hydrateSession e authFetch: o mesmo refresh token
// nunca sai em duas requisições paralelas (plano #59).
let pendingRefresh: Promise<string | null> | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  role: null,
  isAuthenticated: false,
  mfaToken: null,

  login: async (credentials) => {
    const response = await postAuth<LoginResponse>('/api/auth/login', credentials)
    if (response.mfaRequired || response.mfaSetupRequired) {
      set({ mfaToken: response.mfaToken ?? null })
      return { status: response.mfaRequired ? 'mfaRequired' : 'mfaSetupRequired' }
    }
    await openSession(response as AuthTokens)
    return { status: 'authenticated' }
  },

  verifyMfa: (code) => verifySecondFactor({ code }),
  verifyRecoveryCode: (recoveryCode) => verifySecondFactor({ recoveryCode }),

  startMfaSetup: async () => {
    try {
      return await postAuth<MfaSetupInfo>('/api/auth/mfa/setup/start', { mfaToken: get().mfaToken })
    } catch (err) {
      throw expireOnGone(err)
    }
  },

  confirmMfaSetup: async (code) => {
    try {
      const session = await postAuth<MfaSession>('/api/auth/mfa/setup/confirm', { mfaToken: get().mfaToken, code })
      pendingSession = session
      return session.recoveryCodes ?? []
    } catch (err) {
      throw expireOnGone(err)
    }
  },

  acknowledgeRecoveryCodes: async () => {
    if (!pendingSession) return
    const session = pendingSession
    pendingSession = null
    await openSession(session)
  },

  cancelMfa: () => {
    pendingSession = null
    set({ mfaToken: null })
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
