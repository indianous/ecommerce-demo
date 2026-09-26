const SEVEN_DAYS = 60 * 60 * 24 * 7

interface CookieWriter {
  set: (name: string, value: string, options: Record<string, unknown>) => unknown
}

interface SessionData {
  accessToken?: string
  refreshToken?: string | null
  tokenType?: string
  expiresIn?: number
  role?: string | null
}

/**
 * Grava a sessão depois do login completo (senha e, quando houver, o segundo fator): o refresh token em cookie
 * httpOnly e o role em cookie legível, que o proxy usa para proteger as rotas. Sem refresh token (refresh dentro
 * da janela de tolerância) só o role é regravado.
 */
export function setSessionCookies(cookieStore: CookieWriter, data: SessionData) {
  const secure = process.env.NODE_ENV === 'production'
  if (data.refreshToken) {
    cookieStore.set('session', data.refreshToken, { httpOnly: true, secure, sameSite: 'lax', maxAge: SEVEN_DAYS, path: '/' })
  }
  cookieStore.set('role', data.role ?? 'CUSTOMER', { httpOnly: false, secure, sameSite: 'lax', maxAge: SEVEN_DAYS, path: '/' })
}

/** O corpo que o navegador recebe: a sessão sem o refresh token, que fica só no cookie. */
export function sessionBody(data: SessionData) {
  return {
    accessToken: data.accessToken,
    tokenType: data.tokenType,
    expiresIn: data.expiresIn,
    role: data.role,
  }
}
