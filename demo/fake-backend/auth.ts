import type { DemoData, DemoUser } from '../generator/generate'
import { badRequest, bodyOf, noContent, notFound, ok, type DemoResponse, type Route } from './types'

/** O access token vale 15 min, como no backend; o BFF renova pelo refresh token. */
const EXPIRES_IN = 900

/**
 * Tokens opacos `demo.<userId>.<aleatório>`: o frontend não decodifica o token, só o repassa, então basta o backend
 * falso saber de quem ele é.
 */
export function userFromToken(token: string | null | undefined, data: DemoData): DemoUser | null {
  if (!token) return null
  const [prefix, userId, nonce] = token.split('.')
  if (prefix !== 'demo' || !userId || nonce === undefined) return null
  return data.users.find((u) => u.id === userId) ?? null
}

const nonce = () => crypto.randomUUID().slice(0, 8)

function session(user: DemoUser, withRefresh: boolean): DemoResponse {
  return ok({
    accessToken: `demo.${user.id}.a${nonce()}`,
    refreshToken: withRefresh ? `demo.${user.id}.r${nonce()}` : null,
    tokenType: 'Bearer',
    expiresIn: EXPIRES_IN,
    role: user.role,
    mfaRequired: false,
    mfaSetupRequired: false,
    mfaToken: null,
    recoveryCodesRemaining: null,
    recoveryCodes: null,
  })
}

const invalidCredentials = (): DemoResponse => ({ status: 401, body: { message: 'Credenciais inválidas', status: 401 } })

export const authRoutes: Route[] = [
  {
    method: 'POST',
    pattern: '/auth/login',
    handler: (ctx) => {
      const { email, password } = bodyOf(ctx)
      if (typeof email !== 'string' || typeof password !== 'string' || password === '') return invalidCredentials()
      const user = ctx.data.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      return user ? session(user, true) : invalidCredentials()
    },
  },
  {
    method: 'POST',
    pattern: '/auth/refresh',
    handler: (ctx) => {
      const { refreshToken } = bodyOf(ctx)
      const user = typeof refreshToken === 'string' ? userFromToken(refreshToken, ctx.data) : null
      return user ? session(user, false) : { status: 401, body: { message: 'Sessão expirada', status: 401 } }
    },
  },
  {
    method: 'POST',
    pattern: '/auth/register',
    // Nada é gravado: o cadastro abre a sessão do cliente fixo da demo.
    handler: (ctx) => session(ctx.data.users.find((u) => u.email === ctx.data.fixedAccounts.customer)!, true),
  },
  { method: 'POST', pattern: '/auth/logout', handler: () => noContent() },
  { method: 'POST', pattern: '/auth/forgot-password', handler: () => noContent() },
  { method: 'POST', pattern: '/auth/reset-password', handler: () => noContent() },
  { method: 'POST', pattern: '/auth/verify-email', handler: () => noContent() },
  { method: 'POST', pattern: '/auth/verify-email/resend', handler: () => noContent() },
  { method: 'GET', pattern: '/auth/password-tokens/:token', handler: () => notFound('Este link não é válido na demonstração.') },
  ...['/auth/mfa/verify', '/auth/mfa/setup/start', '/auth/mfa/setup/confirm'].map(
    (pattern): Route => ({
      method: 'POST',
      pattern,
      handler: () => badRequest('A verificação em duas etapas não é usada na demonstração. Entre de novo.'),
    }),
  ),
]
