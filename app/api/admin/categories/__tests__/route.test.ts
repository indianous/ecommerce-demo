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

function makeRequest(body: unknown, opts: { authorization?: string } = {}) {
  return {
    headers: { get: (name: string) => (name === 'Authorization' ? (opts.authorization ?? null) : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

describe('GET /api/admin/categories (BFF route)', () => {
  it('repassa Authorization e devolve a lista do backend', async () => {
    const categories = [{ id: 'c-1', name: 'Roupas', slug: 'roupas', description: null, productCount: 3 }]
    fetchMock.mockResolvedValueOnce(Response.json(categories, { status: 200 }))

    const response = await GET(makeRequest(undefined, { authorization: 'Bearer tok' }))

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/admin\/categories$/)
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(categories)
  })

  it('repassa 403 do backend', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }))

    const response = await GET(makeRequest(undefined, { authorization: 'Bearer tok' }))

    expect(response.status).toBe(403)
  })
})

describe('POST /api/admin/categories (BFF route)', () => {
  it('repassa corpo e Authorization para o backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'c-2', name: 'Moda', slug: 'moda' }, { status: 201 }))

    const body = { name: 'Moda', description: 'Roupas' }
    const response = await POST(makeRequest(body, { authorization: 'Bearer tok' }))

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/admin\/categories$/)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual(body)
    expect(response.status).toBe(201)
  })

  it('repassa 409 com a mensagem do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Já existe uma categoria com o slug "moda".' }, { status: 409 }))

    const response = await POST(makeRequest({ name: 'Moda' }, { authorization: 'Bearer tok' }))

    expect(response.status).toBe(409)
    expect((await response.json()).message).toMatch(/já existe/i)
  })
})
