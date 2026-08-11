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

describe('PUT /api/admin/site/nav-items/[id] (BFF route)', () => {
  it('repassa Authorization, corpo e id para o backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'nav-1', label: 'Novo label' }, { status: 200 }))

    const body = { label: 'Novo label', url: '/x', placement: 'BOTH' }
    const response = await PUT(makeRequest(body, { authorization: 'Bearer tok' }), {
      params: Promise.resolve({ id: 'nav-1' }),
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/site/nav-items/nav-1')
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual(body)
    expect(response.status).toBe(200)
  })
})

describe('DELETE /api/admin/site/nav-items/[id] (BFF route)', () => {
  it('repassa Authorization e id, devolvendo 204 sem corpo', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const response = await DELETE(makeRequest(undefined, { authorization: 'Bearer tok' }), {
      params: Promise.resolve({ id: 'nav-1' }),
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/site/nav-items/nav-1')
    expect(init.method).toBe('DELETE')
    expect(response.status).toBe(204)
  })

  it('repassa erro 403 do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Forbidden' }, { status: 403 }))

    const response = await DELETE(makeRequest(undefined, { authorization: 'Bearer tok' }), {
      params: Promise.resolve({ id: 'nav-1' }),
    })

    expect(response.status).toBe(403)
  })
})
