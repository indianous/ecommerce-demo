import { render } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PageViewBeacon } from '../PageViewBeacon'

let mockPathname = '/'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

const calls: { sessionId: string; path: string }[] = []
const server = setupServer(
  http.post('/api/tracking/page-views', async ({ request }) => {
    calls.push((await request.json()) as { sessionId: string; path: string })
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  calls.length = 0
  sessionStorage.clear()
})
afterAll(() => server.close())

beforeEach(() => {
  mockPathname = '/'
})

describe('PageViewBeacon', () => {
  it('dispara POST /api/tracking/page-views com o path atual ao montar', async () => {
    mockPathname = '/catalog'
    render(<PageViewBeacon />)

    await vi.waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].path).toBe('/catalog')
    expect(calls[0].sessionId).toBeTruthy()
  })

  it('não dispara de novo em re-render sem mudança de rota', async () => {
    mockPathname = '/catalog'
    const { rerender } = render(<PageViewBeacon />)
    await vi.waitFor(() => expect(calls).toHaveLength(1))

    rerender(<PageViewBeacon />)

    await new Promise((r) => setTimeout(r, 10))
    expect(calls).toHaveLength(1)
  })

  it('dispara de novo quando a rota muda', async () => {
    mockPathname = '/catalog'
    const { rerender } = render(<PageViewBeacon />)
    await vi.waitFor(() => expect(calls).toHaveLength(1))

    mockPathname = '/checkout'
    rerender(<PageViewBeacon />)

    await vi.waitFor(() => expect(calls).toHaveLength(2))
    expect(calls[1].path).toBe('/checkout')
  })

  it('usa o mesmo sessionId entre navegações', async () => {
    mockPathname = '/catalog'
    const { rerender } = render(<PageViewBeacon />)
    await vi.waitFor(() => expect(calls).toHaveLength(1))

    mockPathname = '/checkout'
    rerender(<PageViewBeacon />)
    await vi.waitFor(() => expect(calls).toHaveLength(2))

    expect(calls[1].sessionId).toBe(calls[0].sessionId)
  })
})
