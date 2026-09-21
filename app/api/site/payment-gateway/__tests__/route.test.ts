import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { GET, PUT } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function makeGetRequest(opts: { authorization?: string } = {}) {
  return {
    headers: { get: (name: string) => (name === 'Authorization' ? (opts.authorization ?? null) : null) },
  } as unknown as NextRequest
}

function makePutRequest(body: unknown, opts: { authorization?: string } = {}) {
  return {
    headers: { get: (name: string) => (name === 'Authorization' ? (opts.authorization ?? null) : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

describe('GET /api/site/payment-gateway (BFF route)', () => {
  it('forwards the Authorization header and status from the backend', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ active: 'MANUAL', available: [] }, { status: 200 }),
    )

    const response = await GET(makeGetRequest({ authorization: 'Bearer tok' }))
    const data = await response.json()

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/site/payment-gateway')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(response.status).toBe(200)
    expect(data.active).toBe('MANUAL')
  })

  it('passes through the backend error status', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }))

    const response = await GET(makeGetRequest())

    expect(response.status).toBe(401)
  })
})

describe('PUT /api/site/payment-gateway (BFF route)', () => {
  it('forwards the Authorization header and body to the backend', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ active: 'STRIPE', available: [] }, { status: 200 }),
    )

    await PUT(makePutRequest({ provider: 'STRIPE' }, { authorization: 'Bearer tok' }))

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/site/payment-gateway')
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual({ provider: 'STRIPE' })
  })

  it('passes through the backend status without altering it', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Conflict' }, { status: 409 }))

    const response = await PUT(makePutRequest({ provider: 'PAGSEGURO' }, { authorization: 'Bearer tok' }))

    expect(response.status).toBe(409)
  })
})
