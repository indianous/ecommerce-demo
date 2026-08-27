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

function makePostRequest(body: unknown, opts: { authorization?: string } = {}) {
  return {
    headers: { get: (name: string) => (name === 'Authorization' ? (opts.authorization ?? null) : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

describe('GET /api/site/distribution-centers (BFF route)', () => {
  it('não exige Authorization e devolve o status do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([{ id: 'dc-1' }], { status: 200 }))

    const response = await GET()
    const data = await response.json()

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/site/distribution-centers')
    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
  })
})

describe('POST /api/site/distribution-centers (BFF route)', () => {
  it('repassa Authorization e corpo, devolvendo o status do backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'dc-1', name: 'CD Zona Sul' }, { status: 201 }))

    const body = { name: 'CD Zona Sul', street: 'Av. das Nações', number: '1000', district: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01310100' }
    const response = await POST(makePostRequest(body, { authorization: 'Bearer tok' }))

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/site/distribution-centers')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual(body)
    expect(response.status).toBe(201)
  })

  it('repassa erro 403 do backend sem alterar o status', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Forbidden' }, { status: 403 }))

    const response = await POST(makePostRequest({ name: 'X' }, { authorization: 'Bearer tok' }))

    expect(response.status).toBe(403)
  })
})
