import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))

import { POST } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  Object.values(cookieStore).forEach((fn) => fn.mockReset())
})

describe('POST /api/auth/logout (BFF route)', () => {
  it('revoga o refresh token no backend e apaga os cookies', async () => {
    cookieStore.get.mockReturnValue({ value: 'ref' })
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const response = await POST()

    expect(response.status).toBe(204)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/auth/logout')
    expect(JSON.parse(init.body as string)).toEqual({ refreshToken: 'ref' })
    expect(cookieStore.delete).toHaveBeenCalledWith('session')
    expect(cookieStore.delete).toHaveBeenCalledWith('role')
  })

  it('apaga os cookies mesmo se o backend falhar', async () => {
    cookieStore.get.mockReturnValue({ value: 'ref' })
    fetchMock.mockRejectedValueOnce(new Error('backend fora do ar'))

    const response = await POST()

    expect(response.status).toBe(204)
    expect(cookieStore.delete).toHaveBeenCalledWith('session')
    expect(cookieStore.delete).toHaveBeenCalledWith('role')
  })

  it('sem cookie de sessão não chama o backend, mas ainda limpa os cookies', async () => {
    cookieStore.get.mockReturnValue(undefined)

    const response = await POST()

    expect(response.status).toBe(204)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(cookieStore.delete).toHaveBeenCalledWith('role')
  })
})
