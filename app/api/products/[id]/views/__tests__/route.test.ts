import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('POST /api/products/[id]/views (BFF route)', () => {
  it('repassa para o backend sem Authorization e devolve 204 sem corpo em sucesso', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const response = await POST(new Request('http://localhost/api/products/prod-1/views', { method: 'POST' }), {
      params: Promise.resolve({ id: 'prod-1' }),
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/catalog/products/prod-1/views')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string> | undefined)?.['Authorization']).toBeUndefined()
    expect(response.status).toBe(204)
  })

  it('devolve 429 quando o rate limit do backend dispara', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ status: 429, message: 'Too many requests. Try again later.' }, { status: 429 }),
    )

    const response = await POST(new Request('http://localhost/api/products/prod-1/views', { method: 'POST' }), {
      params: Promise.resolve({ id: 'prod-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.message).toContain('Too many requests')
  })
})
