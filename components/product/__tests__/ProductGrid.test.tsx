import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProductGrid } from '../ProductGrid'
import type { Product } from '@/types'

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    categories: [{ id: 'cat-1', name: 'Electronics', slug: 'electronics' }],
    name: 'Mechanical Keyboard',
    slug: 'mechanical-keyboard',
    price: 499.9,
    stockQuantity: 10,
    active: true,
    status: 'AVAILABLE',
    createdAt: '2026-06-29T00:00:00',
    updatedAt: '2026-06-29T00:00:00',
    ...overrides,
  }
}

describe('ProductGrid', () => {
  it('renderiza um ProductCard por produto da lista', () => {
    const products = [
      makeProduct({ id: 'prod-1', name: 'Mechanical Keyboard', slug: 'mechanical-keyboard' }),
      makeProduct({ id: 'prod-2', name: 'Wireless Mouse', slug: 'wireless-mouse' }),
    ]
    render(<ProductGrid products={products} />)

    expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument()
    expect(screen.getByText('Wireless Mouse')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('com products=[], renderiza "Nenhum produto encontrado." e nenhum ProductCard', () => {
    render(<ProductGrid products={[]} />)

    expect(screen.getByText('Nenhum produto encontrado.')).toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
