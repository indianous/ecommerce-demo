import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { POST as setupStart } from '../setup/start/route'
import { POST as setupConfirm } from '../setup/confirm/route'
import { POST as recoveryCodes } from '../recovery-codes/route'
import { POST as disable } from '../disable/route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function makeRequest(body?: unknown) {
  return {
    headers: new Headers({ Authorization: 'Bearer tok' }),
    json: async () => body,
  } as unknown as NextRequest
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, headers: init.headers as Record<string, string> }
}

describe('/api/auth/me/mfa/* (BFF)', () => {
  it.each([
    ['setup/start', setupStart, undefined, /\/users\/me\/mfa\/setup\/start$/],
    ['setup/confirm', setupConfirm, { code: '123456', currentCode: '654321' }, /\/users\/me\/mfa\/setup\/confirm$/],
    ['recovery-codes', recoveryCodes, { code: '123456' }, /\/users\/me\/mfa\/recovery-codes$/],
  ] as const)('%s: repassa corpo e Authorization', async (_name, handler, body, url) => {
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }))

    const response = await handler(makeRequest(body))

    const call = lastCall()
    expect(call.url).toMatch(url)
    expect(call.init.method).toBe('POST')
    expect(call.headers['Authorization']).toBe('Bearer tok')
    if (body) expect(JSON.parse(call.init.body as string)).toEqual(body)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('disable: 204 sem corpo', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const response = await disable(makeRequest({ password: 'x', code: '123456' }))

    expect(lastCall().url).toMatch(/\/users\/me\/mfa\/disable$/)
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ password: 'x', code: '123456' })
    expect(response.status).toBe(204)
  })

  it('400 com code é repassado', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ status: 400, code: 'INVALID_MFA_CODE' }, { status: 400 }))

    const response = await recoveryCodes(makeRequest({ code: '000000' }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe('INVALID_MFA_CODE')
  })
})
