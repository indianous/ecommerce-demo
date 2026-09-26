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

function makeRequest(authorization = 'Bearer tok') {
  return { headers: new Headers({ Authorization: authorization }) } as unknown as NextRequest
}

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('POST /api/admin/users/[id]/password-invite (BFF)', () => {
  it('repassa o Authorization para a rota do usuário; 204 sem corpo', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const response = await POST(makeRequest(), params('u-1'))

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/admin\/users\/u-1\/password-invite$/)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    expect(response.status).toBe(204)
  })

  it('403 volta com a mensagem', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ status: 403, message: 'Sem permissão' }, { status: 403 }))

    const response = await POST(makeRequest(), params('u-1'))

    expect(response.status).toBe(403)
    expect((await response.json()).message).toBe('Sem permissão')
  })
})
