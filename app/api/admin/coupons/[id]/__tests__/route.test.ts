import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { DELETE, PUT } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function makeRequest(body: unknown, url = 'http://localhost:3000/api/x', authorization = 'Bearer tok') {
  return {
    url,
    headers: { get: (name: string) => (name === 'Authorization' ? authorization : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

const params = { params: Promise.resolve({ id: 'cup-1' }) }

function lastCall() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, auth: (init.headers as Record<string, string>)['Authorization'] }
}

describe('/api/admin/coupons/[id] (BFF route)', () => {
  it('PUT repassa id, corpo e Authorization', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'cup-1' }))
    const body = { code: 'NATAL', type: 'PERCENT', value: 15, active: true }

    await PUT(makeRequest(body), params)

    const { url, init, auth } = lastCall()
    expect(url).toMatch(/\/admin\/coupons\/cup-1$/)
    expect(init.method).toBe('PUT')
    expect(auth).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual(body)
  })

  it('DELETE devolve 204; 409 volta com a mensagem', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    expect((await DELETE(makeRequest(undefined), params)).status).toBe(204)

    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Desative em vez de excluir.' }, { status: 409 }))
    const conflict = await DELETE(makeRequest(undefined), params)
    expect(conflict.status).toBe(409)
    expect((await conflict.json()).message).toMatch(/desative/i)
  })
})
