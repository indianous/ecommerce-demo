import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))

import { POST as forgotPassword } from '../forgot-password/route'
import { GET as inspectToken } from '../password-tokens/[token]/route'
import { POST as resetPassword } from '../reset-password/route'
import { POST as verifyEmail } from '../verify-email/route'
import { POST as resendVerification } from '../verify-email/resend/route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('TRUST_PROXY_HEADERS', 'true')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  fetchMock.mockReset()
  Object.values(cookieStore).forEach((fn) => fn.mockReset())
})

function makeRequest(body: unknown = undefined, headers: Record<string, string> = {}) {
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9', ...headers }),
    json: async () => body,
  } as unknown as NextRequest
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, headers: init.headers as Record<string, string> }
}

const params = (token: string) => ({ params: Promise.resolve({ token }) })

describe('POST /api/auth/forgot-password (BFF)', () => {
  it('repassa o e-mail e o IP do cliente; 204 volta sem corpo', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const response = await forgotPassword(makeRequest({ email: 'ana@test.com' }))

    const { url, init, headers } = lastCall()
    expect(url).toMatch(/\/auth\/forgot-password$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ email: 'ana@test.com' })
    expect(headers['X-Forwarded-For']).toBe('203.0.113.9')
    expect(response.status).toBe(204)
  })

  it('429 volta com o status', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ status: 429, message: 'Too many requests' }, { status: 429 }))

    const response = await forgotPassword(makeRequest({ email: 'ana@test.com' }))

    expect(response.status).toBe(429)
  })
})

describe('GET /api/auth/password-tokens/[token] (BFF)', () => {
  it('repassa o token (codificado) e o IP; 200 com o propósito', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ purpose: 'RESET', email: 'a***@test.com', expiresAt: '2026-09-24T13:00:00Z' }))

    const response = await inspectToken(makeRequest(), params('abc_DEF-123'))

    const { url, headers } = lastCall()
    expect(url).toMatch(/\/auth\/password-tokens\/abc_DEF-123$/)
    expect(headers['X-Forwarded-For']).toBe('203.0.113.9')
    expect(response.status).toBe(200)
    expect((await response.json()).purpose).toBe('RESET')
  })

  it('410 volta com o status', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ status: 410, message: 'Este link expirou ou já foi usado' }, { status: 410 }))

    const response = await inspectToken(makeRequest(), params('velho'))

    expect(response.status).toBe(410)
  })
})

describe('POST /api/auth/reset-password (BFF)', () => {
  it('repassa o corpo e o IP, e não grava cookie de sessão (não há login automático)', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    const body = { token: 't', newPassword: 'senhaNova123', confirmPassword: 'senhaNova123' }

    const response = await resetPassword(makeRequest(body))

    const { url, init, headers } = lastCall()
    expect(url).toMatch(/\/auth\/reset-password$/)
    expect(JSON.parse(init.body as string)).toEqual(body)
    expect(headers['X-Forwarded-For']).toBe('203.0.113.9')
    expect(response.status).toBe(204)
    expect(cookieStore.set).not.toHaveBeenCalled()
  })

  it('400 volta com a mensagem do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ status: 400, message: 'As senhas não coincidem' }, { status: 400 }))

    const response = await resetPassword(makeRequest({ token: 't', newPassword: 'a', confirmPassword: 'b' }))

    expect(response.status).toBe(400)
    expect((await response.json()).message).toBe('As senhas não coincidem')
  })
})

describe('POST /api/auth/verify-email (BFF)', () => {
  it('repassa o token e o IP; 204 e 410', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ status: 410, message: 'Este link expirou ou já foi usado' }, { status: 410 }))

    const ok = await verifyEmail(makeRequest({ token: 'tok' }))
    const gone = await verifyEmail(makeRequest({ token: 'tok' }))

    const { url, init, headers } = lastCall()
    expect(url).toMatch(/\/auth\/verify-email$/)
    expect(JSON.parse(init.body as string)).toEqual({ token: 'tok' })
    expect(headers['X-Forwarded-For']).toBe('203.0.113.9')
    expect(ok.status).toBe(204)
    expect(gone.status).toBe(410)
  })
})

describe('POST /api/auth/verify-email/resend (BFF)', () => {
  it('repassa o Authorization', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const response = await resendVerification(makeRequest(undefined, { Authorization: 'Bearer tok' }))

    const { url, init, headers } = lastCall()
    expect(url).toMatch(/\/auth\/verify-email\/resend$/)
    expect(init.method).toBe('POST')
    expect(headers['Authorization']).toBe('Bearer tok')
    expect(response.status).toBe(204)
  })
})
