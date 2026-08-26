import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductViewTracker } from '../ProductViewTracker'
import { useAuthStore } from '@/stores/auth.store'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  useAuthStore.setState({ accessToken: null, isAuthenticated: false })
})

describe('ProductViewTracker', () => {
  it('não renderiza nada visível', () => {
    const { container } = render(<ProductViewTracker productId="prod-1" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('anônimo, dispara POST /api/products/{id}/views sem Authorization', () => {
    render(<ProductViewTracker productId="prod-1" />)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/products/prod-1/views')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('Authorization')).toBeNull()
  })

  it('autenticado, dispara POST /api/products/{id}/views com Authorization', () => {
    useAuthStore.setState({ accessToken: 'token-123', isAuthenticated: true })

    render(<ProductViewTracker productId="prod-1" />)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-123')
  })

  it('remontar (nova navegação) dispara o registro de novo', () => {
    const { unmount } = render(<ProductViewTracker productId="prod-1" />)
    unmount()
    render(<ProductViewTracker productId="prod-1" />)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('falha de rede no POST não lança erro', async () => {
    fetchMock.mockRejectedValue(new Error('network error'))

    expect(() => render(<ProductViewTracker productId="prod-1" />)).not.toThrow()
    await Promise.resolve()
  })
})
