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

function makeRequest(body: unknown, authorization = 'Bearer tok', url = 'http://localhost:3000/api/admin/promotions') {
  return {
    url,
    headers: { get: (name: string) => (name === 'Authorization' ? authorization : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

const params = { params: Promise.resolve({ id: 'promo-1' }) }

function lastCall() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, auth: (init.headers as Record<string, string>)['Authorization'] }
}

describe('POST /api/admin/promotions/[id]/products (BFF route)', () => {
  it('repassa id, Authorization e corpo', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'promo-1', productCount: 2 }))

    const response = await POST(makeRequest({ productIds: ['p-1', 'p-2'] }), params)

    const { url, init, auth } = lastCall()
    expect(url).toMatch(/\/admin\/promotions\/promo-1\/products$/)
    expect(init.method).toBe('POST')
    expect(auth).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual({ productIds: ['p-1', 'p-2'] })
    expect(response.status).toBe(200)
  })

  it('repassa 409 com a mensagem do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'conflito' }, { status: 409 }))

    const response = await POST(makeRequest({ productIds: ['p-1', 'p-2'] }), params)

    expect(response.status).toBe(409)
    expect((await response.json()).message).toBe('conflito')
  })
})
