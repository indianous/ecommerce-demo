import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProductCard } from '../ProductCard'
import type { Product } from '@/types'

const mockProduct: Product = {
  id: 'prod-1',
  categoryId: 'cat-1',
  categoryName: 'Electronics',
  name: 'Mechanical Keyboard',
  description: 'An awesome mechanical keyboard',
  price: 499.9,
  stockQuantity: 10,
  imageUrl: 'https://example.com/keyboard.jpg',
  active: true,
}

describe('ProductCard', () => {
  it('renders product name', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument()
  })

  it('renders formatted price in BRL', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText(/499/)).toBeInTheDocument()
  })

  it('renders product image when imageUrl is provided', () => {
    render(<ProductCard product={mockProduct} />)
    const img = screen.getByRole('img', { name: /mechanical keyboard/i })
    expect(img).toHaveAttribute('src', mockProduct.imageUrl)
  })

  it('renders category name', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('Electronics')).toBeInTheDocument()
  })

  it('shows out-of-stock indicator when stockQuantity is 0', () => {
    render(<ProductCard product={{ ...mockProduct, stockQuantity: 0 }} />)
    expect(screen.getByText(/sem estoque/i)).toBeInTheDocument()
  })

  it('renders "add to cart" button when product is in stock', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByRole('button', { name: /adicionar ao carrinho/i })).toBeInTheDocument()
  })
})
