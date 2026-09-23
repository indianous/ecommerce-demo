import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))

import { POST } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  cookieStore.get.mockReturnValue({ value: 'old-refresh' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  Object.values(cookieStore).forEach((fn) => fn.mockReset())
})

const request = { headers: new Headers() } as unknown as NextRequest

describe('POST /api/auth/refresh (BFF route)', () => {
  it('sem cookie de sessão devolve 401 sem chamar o backend', async () => {
    cookieStore.get.mockReturnValue(undefined)

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('regrava o cookie de sessão com o refresh token rotacionado', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ accessToken: 'acc2', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 900, role: 'CUSTOMER' }),
    )

    const response = await POST(request)
    const data = await response.json()

    expect(cookieStore.set).toHaveBeenCalledWith('session', 'new-refresh', expect.objectContaining({ httpOnly: true }))
    expect(data.accessToken).toBe('acc2')
    expect(data.refreshToken).toBeUndefined()
  })

  it('quando o backend não devolve refresh token (janela de tolerância) mantém o cookie de sessão como está', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ accessToken: 'acc3', refreshToken: null, tokenType: 'Bearer', expiresIn: 900, role: 'CUSTOMER' }),
    )

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(cookieStore.set).not.toHaveBeenCalledWith('session', expect.anything(), expect.anything())
    expect(cookieStore.delete).not.toHaveBeenCalled()
  })

  it('quando o backend rejeita apaga os cookies de sessão e de papel e devolve 401', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Sessão revogada' }, { status: 401 }))

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(cookieStore.delete).toHaveBeenCalledWith('session')
    expect(cookieStore.delete).toHaveBeenCalledWith('role')
  })
})
