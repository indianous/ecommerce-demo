import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@indianous/base-ds'
import { describe, expect, it } from 'vitest'
import type { Product } from '@/types'
import { ProductCarousel } from '../ProductCarousel'

function makeProducts(count: number): Product[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${i + 1}`,
    categories: [],
    name: `Produto ${i + 1}`,
    slug: `produto-${i + 1}`,
    description: '',
    price: 10 + i,
    stockQuantity: 5,
    imageUrls: [],
    active: true,
    status: 'AVAILABLE',
    freeShipping: false,
    createdAt: '2026-01-01T00:00:00',
    updatedAt: '2026-01-01T00:00:00',
  }))
}

function renderCarousel(count: number) {
  return render(
    <ToastProvider>
      <ProductCarousel title="Produtos relacionados" products={makeProducts(count)} />
    </ToastProvider>,
  )
}

// O Carousel do base-ds rotula os slides e os controles em inglês ("Slide 1 of 2", "Next slide")
const pages = () => screen.getAllByRole('group', { name: /slide/i })
const names = (page: HTMLElement) => within(page).getAllByText(/^Produto \d+$/).map((el) => el.textContent)

describe('ProductCarousel', () => {
  it('8 produtos → 2 páginas com 4 cards cada, e setas e pontos para navegar', async () => {
    const user = userEvent.setup()
    renderCarousel(8)

    expect(pages()).toHaveLength(2)
    expect(names(pages()[0])).toEqual(['Produto 1', 'Produto 2', 'Produto 3', 'Produto 4'])
    expect(names(pages()[1])).toEqual(['Produto 5', 'Produto 6', 'Produto 7', 'Produto 8'])
    expect(screen.getAllByRole('button', { name: /go to slide/i })).toHaveLength(2)

    expect(pages()[1]).toHaveClass('hidden')
    await user.click(screen.getByRole('button', { name: /next slide/i }))
    expect(pages()[1]).not.toHaveClass('hidden')
    expect(pages()[0]).toHaveClass('hidden')
  })

  it('6 produtos → 2 páginas (4 + 2)', () => {
    renderCarousel(6)

    expect(pages()).toHaveLength(2)
    expect(names(pages()[1])).toEqual(['Produto 5', 'Produto 6'])
  })

  it('3 produtos → 1 página, sem setas e sem pontos', () => {
    renderCarousel(3)

    expect(pages()).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /slide/i })).not.toBeInTheDocument()
  })

  it('cada página é uma grade: 2 colunas no celular, 4 a partir de md', () => {
    renderCarousel(5)

    pages().forEach((page) => {
      expect(page.firstElementChild).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-4')
    })
  })

  it('sem produtos → não renderiza', () => {
    const { container } = render(<ProductCarousel title="Produtos relacionados" products={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
