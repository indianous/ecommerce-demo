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

function makeRequest(url: string, opts: { authorization?: string } = {}) {
  return {
    url,
    headers: { get: (name: string) => (name === 'Authorization' ? (opts.authorization ?? null) : null) },
  } as unknown as NextRequest
}

const params = { params: Promise.resolve({ id: 'prod-1' }) }

describe('GET /api/admin/products/[id] (BFF route)', () => {
  it('chama a rota do painel (não o catálogo público) repassando o Authorization', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'prod-1', name: 'Blusa', active: false }, { status: 200 }))

    const response = await GET(
      makeRequest('http://localhost/api/admin/products/prod-1', { authorization: 'Bearer tok' }),
      params,
    )
    const data = await response.json()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/admin\/products\/prod-1$/)
    expect(url).not.toContain('/catalog/')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(response.status).toBe(200)
    expect(data).toMatchObject({ id: 'prod-1', active: false })
  })

  it('repassa o 404 do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Product not found: prod-1' }, { status: 404 }))

    const response = await GET(makeRequest('http://localhost/api/admin/products/prod-1', { authorization: 'Bearer tok' }), params)

    expect(response.status).toBe(404)
  })

  it('repassa o 403 do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Acesso negado' }, { status: 403 }))

    const response = await GET(makeRequest('http://localhost/api/admin/products/prod-1', { authorization: 'Bearer tok' }), params)

    expect(response.status).toBe(403)
  })
})
