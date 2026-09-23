import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { GET, POST } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function makeRequest(url: string, authorization?: string) {
  return {
    url,
    headers: { get: (name: string) => (name === 'Authorization' ? (authorization ?? null) : null) },
  } as unknown as NextRequest
}

describe('GET /api/admin/promotions (BFF route)', () => {
  it('repassa a query e o Authorization', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ content: [], totalPages: 0 }, { status: 200 }))

    const response = await GET(makeRequest('http://localhost:3000/api/admin/promotions?status=ACTIVE&page=0&size=20', 'Bearer tok'))

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/admin\/promotions\?status=ACTIVE&page=0&size=20$/)
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(response.status).toBe(200)
  })

  it('repassa 403 do backend', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }))

    const response = await GET(makeRequest('http://localhost:3000/api/admin/promotions', 'Bearer tok'))

    expect(response.status).toBe(403)
  })
})

describe('POST /api/admin/promotions (BFF route)', () => {
  it('repassa corpo e Authorization, devolvendo 201', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'promo-1', name: 'Black Friday' }, { status: 201 }))
    const body = { name: 'Black Friday', type: 'PERCENT', value: 20, startDate: '2026-11-01T00:00', endDate: '2026-11-30T23:59', productIds: ['p-1'] }

    const response = await POST({
      headers: { get: (n: string) => (n === 'Authorization' ? 'Bearer tok' : null) },
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/admin\/promotions$/)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual(body)
    expect(response.status).toBe(201)
  })

  it('repassa 409 com a mensagem do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Já existe uma promoção chamada "BF".' }, { status: 409 }))

    const response = await POST({
      headers: { get: () => 'Bearer tok' },
      json: vi.fn().mockResolvedValue({ name: 'BF' }),
    } as unknown as NextRequest)

    expect(response.status).toBe(409)
    expect((await response.json()).message).toMatch(/já existe/i)
  })
})
