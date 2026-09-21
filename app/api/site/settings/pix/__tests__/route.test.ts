import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { PUT } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function makeRequest(body: unknown, authorization?: string) {
  return {
    headers: { get: (name: string) => (name === 'Authorization' ? (authorization ?? null) : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

describe('PUT /api/site/settings/pix (BFF route)', () => {
  it('repassa Authorization e o corpo JSON ao backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ pixKey: '52998224725' }))

    const response = await PUT(makeRequest({ pixKey: '529.982.247-25', holderName: 'Loja' }, 'Bearer tok'))

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/site/settings/pix')
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toEqual({ pixKey: '529.982.247-25', holderName: 'Loja' })
    expect(response.status).toBe(200)
  })

  it('repassa o 400 do backend (chave inválida) com a mensagem', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Chave PIX inválida' }, { status: 400 }))

    const response = await PUT(makeRequest({ pixKey: '123' }, 'Bearer tok'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Chave PIX inválida')
  })
})
