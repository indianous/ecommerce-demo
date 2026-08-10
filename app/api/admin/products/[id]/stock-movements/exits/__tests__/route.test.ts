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

function makeRequest(body: unknown, opts: { authorization?: string } = {}) {
  return {
    headers: { get: (name: string) => (name === 'Authorization' ? (opts.authorization ?? null) : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

describe('POST /api/admin/products/[id]/stock-movements/exits (BFF route)', () => {
  it('forwards Authorization, body and status', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'mv-2' }, { status: 201 }))

    const response = await POST(
      makeRequest({ reason: 'LOSS_DAMAGE', lotId: 'lot-1', quantity: 3 }, { authorization: 'Bearer tok' }),
      { params: Promise.resolve({ id: 'prod-1' }) },
    )
    const data = await response.json()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/admin/products/prod-1/stock-movements/exits')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(response.status).toBe(201)
    expect(data.id).toBe('mv-2')
  })

  it('passes through backend error status (409/422)', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Estoque insuficiente' }, { status: 422 }))

    const response = await POST(
      makeRequest({ reason: 'LOSS_DAMAGE', lotId: 'lot-1', quantity: 999 }),
      { params: Promise.resolve({ id: 'prod-1' }) },
    )

    expect(response.status).toBe(422)
  })
})
