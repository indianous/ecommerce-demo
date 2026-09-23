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

describe('POST /api/cart/coupon (BFF route)', () => {
  it('repassa o código e o Authorization, e devolve o desconto', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ code: 'DEZ', discountAmount: 20, subtotal: 200 }))

    const response = await POST(makeRequest({ code: 'dez' }))

    const { url, init, auth } = lastCall()
    expect(url).toMatch(/\/cart\/coupon$/)
    expect(init.method).toBe('POST')
    expect(auth).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual({ code: 'dez' })
    expect(await response.json()).toEqual({ code: 'DEZ', discountAmount: 20, subtotal: 200 })
  })

  it('422 volta com a mensagem do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Cupom expirado' }, { status: 422 }))

    const response = await POST(makeRequest({ code: 'FOI' }))

    expect(response.status).toBe(422)
    expect((await response.json()).message).toBe('Cupom expirado')
  })
})
