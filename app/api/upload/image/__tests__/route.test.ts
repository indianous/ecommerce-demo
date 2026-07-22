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

// NextRequest.formData() hangs in jsdom when the body is a binary FormData,
// so we use a plain mock object that matches the parts the route handler uses.
function makeUploadRequest(opts: { authorization?: string } = {}) {
  const formData = new FormData()
  formData.append(
    'file',
    new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'photo.png', { type: 'image/png' }),
  )

  return {
    headers: { get: (name: string) => (name === 'Authorization' ? (opts.authorization ?? null) : null) },
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as NextRequest
}

describe('POST /api/upload/image (BFF route)', () => {
  it('forwards the Authorization header to the backend', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ url: '/uploads/uuid.png' }, { status: 200 }))

    await POST(makeUploadRequest({ authorization: 'Bearer tok' }))

    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
  })

  it('calls the backend upload endpoint', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ url: '/uploads/uuid.png' }, { status: 200 }))

    await POST(makeUploadRequest({ authorization: 'Bearer tok' }))

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/upload/image')
  })

  it('returns 200 with the url when backend succeeds', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ url: '/uploads/uuid.png' }, { status: 200 }))

    const response = await POST(makeUploadRequest({ authorization: 'Bearer tok' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.url).toBe('/uploads/uuid.png')
  })

  it('passes through the backend error status', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Forbidden' }, { status: 403 }))

    const response = await POST(makeUploadRequest({ authorization: 'Bearer tok' }))

    expect(response.status).toBe(403)
  })

  it('passes through 400 when backend rejects the file type', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Tipo de arquivo inválido' }, { status: 400 }))

    const response = await POST(makeUploadRequest({ authorization: 'Bearer tok' }))

    expect(response.status).toBe(400)
  })
})
