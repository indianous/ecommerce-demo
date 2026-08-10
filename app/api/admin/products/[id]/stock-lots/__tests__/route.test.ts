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

describe('GET /api/admin/products/[id]/stock-lots (BFF route)', () => {
  it('forwards Authorization and status from the backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ content: [{ id: 'lot-1' }] }, { status: 200 }))

    const response = await GET(
      makeRequest('http://localhost/api/admin/products/prod-1/stock-lots', { authorization: 'Bearer tok' }),
      { params: Promise.resolve({ id: 'prod-1' }) },
    )
    const data = await response.json()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/products/prod-1/stock-lots')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(response.status).toBe(200)
    expect(data.content).toHaveLength(1)
  })
})
