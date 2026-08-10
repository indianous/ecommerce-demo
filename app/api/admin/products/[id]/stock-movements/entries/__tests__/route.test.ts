import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { POST } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function makeRequest(body: unknown, opts: { authorization?: string } = {}) {
  return {
    headers: { get: (name: string) => (name === 'Authorization' ? (opts.authorization ?? null) : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

describe('POST /api/admin/products/[id]/stock-movements/entries (BFF route)', () => {
  it('forwards Authorization, body and status', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'mv-1' }, { status: 201 }))

    const response = await POST(
      makeRequest({ reason: 'PURCHASE', quantity: 20 }, { authorization: 'Bearer tok' }),
      { params: Promise.resolve({ id: 'prod-1' }) },
    )
    const data = await response.json()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/products/prod-1/stock-movements/entries')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'PURCHASE', quantity: 20 })
    expect(response.status).toBe(201)
    expect(data.id).toBe('mv-1')
  })

  it('passes through backend error status', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Forbidden' }, { status: 403 }))

    const response = await POST(
      makeRequest({ reason: 'PURCHASE', quantity: 20 }),
      { params: Promise.resolve({ id: 'prod-1' }) },
    )

    expect(response.status).toBe(403)
  })
})
