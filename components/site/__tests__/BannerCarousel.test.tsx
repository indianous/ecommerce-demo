import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BannerCarousel } from '../BannerCarousel'
import type { Banner } from '@/types'

function makeBanner(overrides: Partial<Banner> = {}): Banner {
  return {
    id: 'banner-1',
    imageUrl: 'https://cdn.example.com/banner-1.jpg',
    linkUrl: null,
    position: 0,
    ...overrides,
  }
}

describe('BannerCarousel', () => {
  it('renderiza uma imagem por banner', () => {
    const banners = [makeBanner({ id: 'b1' }), makeBanner({ id: 'b2' })]
    render(<BannerCarousel banners={banners} />)

    expect(screen.getAllByAltText('Banner promocional')).toHaveLength(2)
  })

  it('banner com linkUrl preenchido: imagem fica dentro de um link com href igual ao linkUrl', () => {
    const banners = [makeBanner({ linkUrl: 'https://example.com/promo' })]
    render(<BannerCarousel banners={banners} />)

    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/promo')
  })

  it('banner com linkUrl null: imagem renderiza sem wrapper de link', () => {
    const banners = [makeBanner({ linkUrl: null })]
    render(<BannerCarousel banners={banners} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('banners=[] não renderiza nada', () => {
    const { container } = render(<BannerCarousel banners={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('rótulos de acessibilidade em português (plano 67)', () => {
    const banners = [makeBanner(), makeBanner({ id: 'banner-2', position: 1 })]
    render(<BannerCarousel banners={banners} />)

    expect(screen.getByRole('region', { name: 'Banners' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Banner 1 de 2' })).toHaveAttribute('aria-roledescription', 'banner')
    expect(screen.getByRole('button', { name: 'Banner anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próximo banner' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir para o banner 2' })).toBeInTheDocument()
  })
})
