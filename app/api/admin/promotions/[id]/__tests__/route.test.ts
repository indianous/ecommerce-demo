import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { DELETE, GET, PUT } from '../route'

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

describe('/api/admin/promotions/[id] (BFF route)', () => {
  it('GET repassa o id e o Authorization', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'promo-1', products: [] }))

    const response = await GET(makeRequest(undefined), params)

    const { url, auth } = lastCall()
    expect(url).toMatch(/\/admin\/promotions\/promo-1$/)
    expect(auth).toBe('Bearer tok')
    expect(response.status).toBe(200)
  })

  it('PUT repassa corpo, id e Authorization; 400 volta com a mensagem', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'precisa ser menor que o preço normal em: Mouse' }, { status: 400 }))
    const body = { name: 'BF', type: 'FIXED_PRICE', value: 40, startDate: 'x', endDate: 'y' }

    const response = await PUT(makeRequest(body), params)

    const { url, init } = lastCall()
    expect(url).toMatch(/\/admin\/promotions\/promo-1$/)
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual(body)
    expect(response.status).toBe(400)
  })

  it('DELETE repassa o id e devolve 204 sem corpo', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const response = await DELETE(makeRequest(undefined), params)

    const { url, init } = lastCall()
    expect(url).toMatch(/\/admin\/promotions\/promo-1$/)
    expect(init.method).toBe('DELETE')
    expect(response.status).toBe(204)
  })
})
