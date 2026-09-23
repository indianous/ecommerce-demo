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

function makeRequest(body: unknown, url = 'http://localhost:3000/api/x', authorization = 'Bearer tok') {
  return {
    url,
    headers: { get: (name: string) => (name === 'Authorization' ? authorization : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

const params = { params: Promise.resolve({ id: 'cup-1' }) }

function lastCall() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, auth: (init.headers as Record<string, string>)['Authorization'] }
}

describe('GET /api/admin/coupons/[id]/redemptions (BFF route)', () => {
  it('repassa id, query e Authorization', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ content: [], totalPages: 0 }))

    await GET(makeRequest(undefined, 'http://localhost:3000/api/admin/coupons/cup-1/redemptions?page=1'), params)

    const { url, auth } = lastCall()
    expect(url).toMatch(/\/admin\/coupons\/cup-1\/redemptions\?page=1$/)
    expect(auth).toBe('Bearer tok')
  })
})
