import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('GET /api/site/nav-items (BFF route)', () => {
  it('repassa para o backend sem Authorization e devolve o status', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([{ id: 'nav-1', type: 'LINK', label: 'Contato' }], { status: 200 }))

    const response = await GET()
    const data = await response.json()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit | undefined]
    expect(url).toContain('/site/nav-items')
    expect(init?.headers).toBeUndefined()
    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
  })
})
