import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('GET /api/site/payment-methods (BFF route)', () => {
  it('chama o endpoint público do backend, sem Authorization, e devolve o corpo por entrega', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ DELIVERY: ['PIX'], PICKUP: ['PIX', 'PAY_ON_PICKUP'] }))

    const response = await GET()
    const data = await response.json()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit | undefined]
    expect(url).toContain('/site/payment-methods')
    expect(init?.headers).toBeUndefined()
    expect(response.status).toBe(200)
    expect(data).toEqual({ DELIVERY: ['PIX'], PICKUP: ['PIX', 'PAY_ON_PICKUP'] })
  })

  it('repassa o status de erro do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'erro' }, { status: 500 }))

    const response = await GET()

    expect(response.status).toBe(500)
  })
})
