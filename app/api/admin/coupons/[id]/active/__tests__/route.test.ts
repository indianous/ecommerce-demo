import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { PATCH } from '../route'

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

describe('PATCH /api/admin/coupons/[id]/active (BFF route)', () => {
  it('repassa id, corpo e Authorization', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'cup-1', active: false }))

    await PATCH(makeRequest({ active: false }), params)

    const { url, init, auth } = lastCall()
    expect(url).toMatch(/\/admin\/coupons\/cup-1\/active$/)
    expect(init.method).toBe('PATCH')
    expect(auth).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual({ active: false })
  })
})
