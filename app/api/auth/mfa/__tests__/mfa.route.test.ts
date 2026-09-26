import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))

import { POST as verify } from '../verify/route'
import { POST as setupStart } from '../setup/start/route'
import { POST as setupConfirm } from '../setup/confirm/route'

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

function makeRequest(body: unknown) {
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    json: async () => body,
  } as unknown as NextRequest
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, headers: init.headers as Record<string, string> }
}

const session = { accessToken: 'acc', refreshToken: 'ref', tokenType: 'Bearer', expiresIn: 900, role: 'EMPLOYEE' }

describe('POST /api/auth/mfa/verify', () => {
  it('sucesso: grava session e role, não devolve o refresh token e repassa recoveryCodesRemaining', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ ...session, recoveryCodesRemaining: 9 }))

    const response = await verify(makeRequest({ mfaToken: 'm', code: '123456' }))
    const data = await response.json()

    const { url, init, headers } = lastCall()
    expect(url).toMatch(/\/auth\/mfa\/verify$/)
    expect(JSON.parse(init.body as string)).toEqual({ mfaToken: 'm', code: '123456' })
    expect(headers['X-Forwarded-For']).toBe('203.0.113.9')
    expect(cookieStore.set).toHaveBeenCalledWith('session', 'ref', expect.objectContaining({ httpOnly: true }))
    expect(cookieStore.set).toHaveBeenCalledWith('role', 'EMPLOYEE', expect.anything())
    expect(data).toEqual({ accessToken: 'acc', tokenType: 'Bearer', expiresIn: 900, role: 'EMPLOYEE', recoveryCodesRemaining: 9 })
  })

  it.each([
    [401, { status: 401, code: 'INVALID_MFA_CODE', attemptsRemaining: 3 }],
    [410, { status: 410, code: 'MFA_CHALLENGE_EXPIRED' }],
  ])('%i é repassado sem cookie', async (status, body) => {
    fetchMock.mockResolvedValueOnce(Response.json(body, { status }))

    const response = await verify(makeRequest({ mfaToken: 'm', code: '000000' }))

    expect(response.status).toBe(status)
    expect(await response.json()).toEqual(body)
    expect(cookieStore.set).not.toHaveBeenCalled()
  })
})

describe('POST /api/auth/mfa/setup/start', () => {
  it('repassa o mfaToken e devolve segredo e otpauthUri', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ secret: 'ABC', otpauthUri: 'otpauth://totp/x' }))

    const response = await setupStart(makeRequest({ mfaToken: 'm' }))

    expect(lastCall().url).toMatch(/\/auth\/mfa\/setup\/start$/)
    expect(lastCall().headers['X-Forwarded-For']).toBe('203.0.113.9')
    expect(await response.json()).toEqual({ secret: 'ABC', otpauthUri: 'otpauth://totp/x' })
    expect(cookieStore.set).not.toHaveBeenCalled()
  })

  it('410 é repassado', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ status: 410 }, { status: 410 }))

    expect((await setupStart(makeRequest({ mfaToken: 'm' }))).status).toBe(410)
  })
})

describe('POST /api/auth/mfa/setup/confirm', () => {
  it('sucesso: grava os cookies e devolve a sessão com os códigos de recuperação, sem refresh token', async () => {
    const codes = ['AAAA-BBBB', 'CCCC-DDDD']
    fetchMock.mockResolvedValueOnce(Response.json({ ...session, recoveryCodes: codes }))

    const response = await setupConfirm(makeRequest({ mfaToken: 'm', code: '123456' }))
    const data = await response.json()

    expect(lastCall().url).toMatch(/\/auth\/mfa\/setup\/confirm$/)
    expect(cookieStore.set).toHaveBeenCalledWith('session', 'ref', expect.anything())
    expect(data.recoveryCodes).toEqual(codes)
    expect(data.refreshToken).toBeUndefined()
  })

  it('401 é repassado sem cookie', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ status: 401, attemptsRemaining: 4 }, { status: 401 }))

    const response = await setupConfirm(makeRequest({ mfaToken: 'm', code: '000000' }))

    expect(response.status).toBe(401)
    expect(cookieStore.set).not.toHaveBeenCalled()
  })
})
