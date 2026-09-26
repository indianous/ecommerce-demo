import { afterEach, describe, expect, it, vi } from 'vitest'
import { sessionBody, setSessionCookies } from '../session-cookies'

const cookieStore = { set: vi.fn() }

afterEach(() => {
  cookieStore.set.mockReset()
  vi.unstubAllEnvs()
})

describe('setSessionCookies', () => {
  it('grava o refresh token httpOnly e o role legível pelo proxy, por 7 dias', () => {
    setSessionCookies(cookieStore, { refreshToken: 'ref', role: 'EMPLOYEE' })

    expect(cookieStore.set).toHaveBeenCalledWith('session', 'ref', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    expect(cookieStore.set).toHaveBeenCalledWith('role', 'EMPLOYEE', expect.objectContaining({ httpOnly: false, path: '/' }))
  })

  it('sem refresh token (refresh dentro da janela de tolerância) só grava o role', () => {
    setSessionCookies(cookieStore, { role: 'ADMIN' })

    expect(cookieStore.set).toHaveBeenCalledTimes(1)
    expect(cookieStore.set).toHaveBeenCalledWith('role', 'ADMIN', expect.anything())
  })

  it('role ausente vira CUSTOMER', () => {
    setSessionCookies(cookieStore, { refreshToken: 'ref' })

    expect(cookieStore.set).toHaveBeenCalledWith('role', 'CUSTOMER', expect.anything())
  })

  it('em produção os cookies são secure', () => {
    vi.stubEnv('NODE_ENV', 'production')

    setSessionCookies(cookieStore, { refreshToken: 'ref', role: 'CUSTOMER' })

    expect(cookieStore.set).toHaveBeenCalledWith('session', 'ref', expect.objectContaining({ secure: true }))
  })
})

describe('sessionBody', () => {
  it('devolve a sessão sem o refresh token', () => {
    expect(
      sessionBody({ accessToken: 'acc', refreshToken: 'ref', tokenType: 'Bearer', expiresIn: 900, role: 'CUSTOMER' }),
    ).toEqual({ accessToken: 'acc', tokenType: 'Bearer', expiresIn: 900, role: 'CUSTOMER' })
  })
})
