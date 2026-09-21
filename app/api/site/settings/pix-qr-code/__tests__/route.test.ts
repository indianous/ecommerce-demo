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

function makeRequest(formData: FormData, authorization?: string) {
  return {
    headers: { get: (name: string) => (name === 'Authorization' ? (authorization ?? null) : null) },
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as NextRequest
}

describe('PUT /api/site/settings/pix-qr-code (BFF route)', () => {
  it('repassa Authorization e o FormData ao backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ pixQrCodeUrl: '/uploads/qr.png' }))
    const formData = new FormData()
    formData.append('file', new File(['x'], 'qr.png', { type: 'image/png' }))

    const response = await PUT(makeRequest(formData, 'Bearer tok'))
    const data = await response.json()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/site/settings/pix-qr-code')
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(init.body).toBe(formData)
    expect(data.pixQrCodeUrl).toBe('/uploads/qr.png')
  })

  it('repassa o 400 do backend (tipo de arquivo inválido)', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Tipo inválido' }, { status: 400 }))

    const response = await PUT(makeRequest(new FormData(), 'Bearer tok'))

    expect(response.status).toBe(400)
  })
})
