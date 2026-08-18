import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}))

const { generateMetadata } = await import('../layout')

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('RootLayout generateMetadata', () => {
  it('usa siteTitle/defaultDescription do backend quando preenchidos', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ siteTitle: 'Loja Teste', defaultDescription: 'Descrição de teste' }, { status: 200 }),
    )

    const metadata = await generateMetadata()

    expect(metadata).toEqual({
      title: { template: '%s · Loja Teste', default: 'Loja Teste' },
      description: 'Descrição de teste',
    })
  })

  it('cai no fallback quando siteTitle/defaultDescription são null', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ siteTitle: null, defaultDescription: null }, { status: 200 }),
    )

    const metadata = await generateMetadata()

    expect(metadata).toEqual({
      title: { template: '%s · Loja', default: 'Loja' },
      description: 'Loja online — catálogo, carrinho e pedidos.',
    })
  })

  it('cai no fallback quando o fetch falha', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network error'))

    const metadata = await generateMetadata()

    expect(metadata).toEqual({
      title: { template: '%s · Loja', default: 'Loja' },
      description: 'Loja online — catálogo, carrinho e pedidos.',
    })
  })

  it('cai no fallback quando o backend responde erro', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'error' }, { status: 500 }))

    const metadata = await generateMetadata()

    expect(metadata).toEqual({
      title: { template: '%s · Loja', default: 'Loja' },
      description: 'Loja online — catálogo, carrinho e pedidos.',
    })
  })
})
