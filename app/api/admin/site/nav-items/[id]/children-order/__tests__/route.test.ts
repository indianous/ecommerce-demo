import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { PATCH } from '../route'

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

describe('PATCH /api/admin/site/nav-items/[id]/children-order (BFF route)', () => {
  it('repassa Authorization, id da coleção e corpo para o backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([{ id: 'collection-1', children: [] }], { status: 200 }))

    const body = { orderedIds: ['child-2', 'child-1'] }
    const response = await PATCH(makeRequest(body, { authorization: 'Bearer tok' }), {
      params: Promise.resolve({ id: 'collection-1' }),
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/site/nav-items/collection-1/children-order')
    expect(init.method).toBe('PATCH')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual(body)
    expect(response.status).toBe(200)
  })
})
