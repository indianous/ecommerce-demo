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

function makeRequest(body: unknown, url = 'http://localhost:3000/api/x', authorization = 'Bearer tok') {
  return {
    url,
    headers: { get: (name: string) => (name === 'Authorization' ? authorization : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}


function lastCall() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, auth: (init.headers as Record<string, string>)['Authorization'] }
}

describe('/api/admin/coupons (BFF route)', () => {
  it('GET repassa a query e o Authorization', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ content: [], totalPages: 0 }))

    await GET(makeRequest(undefined, 'http://localhost:3000/api/admin/coupons?search=natal&page=0&size=20'))

    const { url, auth } = lastCall()
    expect(url).toMatch(/\/admin\/coupons\?search=natal&page=0&size=20$/)
    expect(auth).toBe('Bearer tok')
  })

  it('POST repassa o corpo; 409 volta com a mensagem', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Já existe um cupom com o código NATAL.' }, { status: 409 }))
    const body = { code: 'natal', type: 'PERCENT', value: 10, active: true }

    const response = await POST(makeRequest(body))

    const { url, init } = lastCall()
    expect(url).toMatch(/\/admin\/coupons$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual(body)
    expect(response.status).toBe(409)
  })
})
