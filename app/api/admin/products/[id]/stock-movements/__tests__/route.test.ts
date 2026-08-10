import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { GET } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function makeRequest(url: string, opts: { authorization?: string } = {}) {
  return {
    url,
    headers: { get: (name: string) => (name === 'Authorization' ? (opts.authorization ?? null) : null) },
  } as unknown as NextRequest
}

describe('GET /api/admin/products/[id]/stock-movements (BFF route)', () => {
  it('forwards Authorization and query params to the backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ content: [] }, { status: 200 }))

    await GET(
      makeRequest('http://localhost/api/admin/products/prod-1/stock-movements?reason=PURCHASE&page=0', {
        authorization: 'Bearer tok',
      }),
      { params: Promise.resolve({ id: 'prod-1' }) },
    )

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/products/prod-1/stock-movements?')
    expect(url).toContain('reason=PURCHASE')
    expect(url).toContain('page=0')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
  })

  it('passes through backend status', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Forbidden' }, { status: 403 }))

    const response = await GET(
      makeRequest('http://localhost/api/admin/products/prod-1/stock-movements'),
      { params: Promise.resolve({ id: 'prod-1' }) },
    )

    expect(response.status).toBe(403)
  })
})
