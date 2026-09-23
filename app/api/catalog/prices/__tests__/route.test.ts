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

describe('POST /api/catalog/prices (BFF route)', () => {
  it('repassa os ids para /catalog/products/prices e devolve a lista', async () => {
    const prices = [{ id: 'p-1', effectivePrice: 80, onPromotion: true, available: true }]
    fetchMock.mockResolvedValueOnce(Response.json(prices, { status: 200 }))

    const request = { json: vi.fn().mockResolvedValue({ ids: ['p-1'] }) } as unknown as NextRequest
    const response = await POST(request)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/catalog\/products\/prices$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ ids: ['p-1'] })
    expect(await response.json()).toEqual(prices)
  })
})
