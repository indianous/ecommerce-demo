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

describe('/api/catalog/products (BFF)', () => {
  it('GET repassa a busca para o catálogo público', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ content: [], totalPages: 0 }))

    const response = await GET({ url: 'http://localhost:3000/api/catalog/products?search=lap&size=10' } as unknown as NextRequest)

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toMatch(/\/catalog\/products\?search=lap&size=10$/)
    expect(response.status).toBe(200)
  })
})
