import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductViewTracker } from '../ProductViewTracker'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('ProductViewTracker', () => {
  it('não renderiza nada visível', () => {
    const { container } = render(<ProductViewTracker productId="prod-1" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('dispara exatamente um POST /api/products/{id}/views ao montar', () => {
    render(<ProductViewTracker productId="prod-1" />)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/products/prod-1/views', { method: 'POST' })
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
