import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))

import { POST } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  fetchMock.mockReset()
  Object.values(cookieStore).forEach((fn) => fn.mockReset())
})

function makeRequest(headers: Record<string, string> = {}) {
  return {
    headers: new Headers(headers),
    json: async () => ({ email: 'a@b.com', password: 'secret123' }),
  } as unknown as NextRequest
}

const backendTokens = { accessToken: 'acc', refreshToken: 'ref', tokenType: 'Bearer', expiresIn: 900, role: 'CUSTOMER' }

describe('POST /api/auth/login (BFF route)', () => {
  it('guarda o refresh token no cookie httpOnly e não o devolve no corpo', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(backendTokens))

    const response = await POST(makeRequest())
    const data = await response.json()

    expect(cookieStore.set).toHaveBeenCalledWith('session', 'ref', expect.objectContaining({ httpOnly: true }))
    expect(data.accessToken).toBe('acc')
    expect(data.refreshToken).toBeUndefined()
  })

  it('repassa o IP do cliente em X-Forwarded-For quando o proxy é confiável', async () => {
    vi.stubEnv('TRUST_PROXY_HEADERS', 'true')
    fetchMock.mockResolvedValueOnce(Response.json(backendTokens))

    await POST(makeRequest({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }))

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['X-Forwarded-For']).toBe('203.0.113.9')
  })

  it('não repassa o X-Forwarded-For do cliente por padrão', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(backendTokens))

    await POST(makeRequest({ 'x-forwarded-for': '6.6.6.6' }))

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['X-Forwarded-For']).toBeUndefined()
  })

  it.each([
    [{ mfaRequired: true, mfaToken: 'mfa-1' }],
    [{ mfaSetupRequired: true, mfaToken: 'mfa-1' }],
  ])('2FA pendente (%o): repassa o corpo e não grava cookie nenhum', async (body) => {
    fetchMock.mockResolvedValueOnce(Response.json(body))

    const response = await POST(makeRequest())
    const data = await response.json()

    expect(cookieStore.set).not.toHaveBeenCalled()
    expect(data).toEqual(body)
  })
})
