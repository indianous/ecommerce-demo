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

describe('GET /api/admin/stock-lots/expiring (BFF route)', () => {
  it('forwards Authorization and the days query param', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([{ id: 'lot-1' }], { status: 200 }))

    await GET(makeRequest('http://localhost/api/admin/stock-lots/expiring?days=15', { authorization: 'Bearer tok' }))

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/stock-lots/expiring?')
    expect(url).toContain('days=15')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
  })
})
