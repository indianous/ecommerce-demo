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

function makeGetRequest(opts: { authorization?: string } = {}) {
  return {
    headers: { get: (name: string) => (name === 'Authorization' ? (opts.authorization ?? null) : null) },
  } as unknown as NextRequest
}

function makePostRequest(body: unknown, opts: { authorization?: string } = {}) {
  return {
    headers: { get: (name: string) => (name === 'Authorization' ? (opts.authorization ?? null) : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

describe('GET /api/admin/site/nav-items (BFF route)', () => {
  it('repassa Authorization e devolve o status do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([{ id: 'nav-1' }], { status: 200 }))

    const response = await GET(makeGetRequest({ authorization: 'Bearer tok' }))
    const data = await response.json()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/site/nav-items')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
  })

  it('sem Authorization repassa 401 do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }))

    const response = await GET(makeGetRequest())

    expect(response.status).toBe(401)
  })
})

describe('POST /api/admin/site/nav-items (BFF route)', () => {
  it('repassa Authorization e corpo, devolvendo o status do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'nav-1', type: 'COLLECTION' }, { status: 201 }))

    const body = { type: 'COLLECTION', label: 'Institucional', placement: 'NAVBAR' }
    const response = await POST(makePostRequest(body, { authorization: 'Bearer tok' }))

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/site/nav-items')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual(body)
    expect(response.status).toBe(201)
  })

  it('repassa erro 403 do backend sem alterar o status', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Forbidden' }, { status: 403 }))

    const response = await POST(makePostRequest({ type: 'LINK', label: 'X' }, { authorization: 'Bearer tok' }))

    expect(response.status).toBe(403)
  })
})
