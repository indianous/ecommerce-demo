import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function makeRequest(body: unknown, opts: { authorization?: string } = {}) {
  return {
    headers: { get: (name: string) => (name === 'Authorization' ? (opts.authorization ?? null) : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

const params = { params: Promise.resolve({ id: 'c-1' }) }

describe('PUT /api/admin/categories/[id] (BFF route)', () => {
  it('repassa Authorization, corpo e id para o backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'c-1', name: 'Moda', slug: 'moda' }, { status: 200 }))

    const body = { name: 'Moda', slug: 'moda', description: '' }
    const response = await PUT(makeRequest(body, { authorization: 'Bearer tok' }), params)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/admin\/categories\/c-1$/)
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual(body)
    expect(response.status).toBe(200)
  })
})

describe('DELETE /api/admin/categories/[id] (BFF route)', () => {
  it('repassa Authorization e id, devolvendo 204 sem corpo', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const response = await DELETE(makeRequest(undefined, { authorization: 'Bearer tok' }), params)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/admin\/categories\/c-1$/)
    expect(init.method).toBe('DELETE')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(response.status).toBe(204)
  })

  it('repassa 409 com a mensagem do backend (categoria em uso)', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Categoria em uso por 2 produto(s).' }, { status: 409 }),
    )

    const response = await DELETE(makeRequest(undefined, { authorization: 'Bearer tok' }), params)

    expect(response.status).toBe(409)
    expect((await response.json()).message).toMatch(/em uso por 2/i)
  })
})
