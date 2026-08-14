import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ProductCard } from '../ProductCard'
import { SiteSettingsContext } from '@/contexts/SiteSettingsContext'
import { useCartStore } from '@/stores/cart.store'
import type { Product } from '@/types'

afterEach(async () => {
  await act(async () => {
    useCartStore.getState().clearCart()
  })
})

const mockProduct: Product = {
  id: 'prod-1',
  categories: [{ id: 'cat-1', name: 'Electronics', slug: 'electronics' }],
  name: 'Mechanical Keyboard',
  slug: 'mechanical-keyboard',
  description: 'An awesome mechanical keyboard',
  price: 499.9,
  stockQuantity: 10,
  imageUrls: ['https://example.com/keyboard.jpg'],
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

  it('renders product image when imageUrls is provided', () => {
    render(<ProductCard product={mockProduct} />)
    const img = screen.getByRole('img', { name: /mechanical keyboard/i })
    expect(img).toHaveAttribute('src', mockProduct.imageUrls[0])
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

  it('adds the product to the cart store when the button is clicked', async () => {
    const user = userEvent.setup()
    render(<ProductCard product={mockProduct} />)

    await user.click(screen.getByRole('button', { name: /adicionar ao carrinho/i }))

    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      productId: 'prod-1',
      name: 'Mechanical Keyboard',
      price: 499.9,
      imageUrl: 'https://example.com/keyboard.jpg',
    })
  })

  it('increments quantity when the same product is added twice', async () => {
    const user = userEvent.setup()
    render(<ProductCard product={mockProduct} />)

    const btn = screen.getByRole('button', { name: /adicionar ao carrinho/i })
    await user.click(btn)
    await user.click(btn)

    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it('renderiza o card como link para a página de detalhe do produto, usando o slug', () => {
    render(<ProductCard product={mockProduct} />)
    const link = screen.getByRole('link', { name: /mechanical keyboard/i })
    expect(link).toHaveAttribute('href', '/catalog/mechanical-keyboard')
  })

  it('mostra a nota média quando reviewCount > 0', () => {
    render(<ProductCard product={{ ...mockProduct, averageRating: 4.5, reviewCount: 3 }} />)
    expect(screen.getByRole('radiogroup', { name: /rating/i })).toBeInTheDocument()
  })

  it('não mostra nota quando reviewCount é 0', () => {
    render(<ProductCard product={{ ...mockProduct, averageRating: undefined, reviewCount: 0 }} />)
    expect(screen.queryByRole('radiogroup', { name: /rating/i })).not.toBeInTheDocument()
  })
})

describe('ProductCard — promoção', () => {
  const promoProduct: Product = {
    ...mockProduct,
    price: 499.9,
    effectivePrice: 399.9,
    onPromotion: true,
  }

  it('produto em promoção mostra preço original riscado, preço promocional em destaque e badge "Promoção"', () => {
    render(<ProductCard product={promoProduct} />)

    expect(screen.getByText(/promoção/i)).toBeInTheDocument()
    expect(screen.getByText(/499,90/)).toBeInTheDocument()
    expect(screen.getByText(/399,90/)).toBeInTheDocument()
  })

  it('produto sem promoção mostra só o preço normal, sem badge', () => {
    render(<ProductCard product={mockProduct} />)

    expect(screen.queryByText(/promoção/i)).not.toBeInTheDocument()
    expect(screen.getByText(/499,90/)).toBeInTheDocument()
  })

  it('adicionar ao carrinho um produto em promoção usa o effectivePrice', async () => {
    const user = userEvent.setup()
    render(<ProductCard product={promoProduct} />)

    await user.click(screen.getByRole('button', { name: /adicionar ao carrinho/i }))

    expect(useCartStore.getState().items[0]).toMatchObject({ price: 399.9 })
  })
})

describe('ProductCard — imagem placeholder', () => {
  const productSemImagem: Product = { ...mockProduct, imageUrls: [] }

  it('renderiza imagem do produto quando imageUrls está presente', () => {
    render(<ProductCard product={mockProduct} />)
    const img = screen.getByRole('img', { name: /mechanical keyboard/i })
    expect(img).toHaveAttribute('src', mockProduct.imageUrls[0])
  })

  it('renderiza placeholder do contexto quando imageUrls é vazio', () => {
    render(
      <SiteSettingsContext.Provider value={{ placeholderImageUrl: 'https://cdn.example.com/ph.jpg', faviconUrl: null, instagramUrl: null, tiktokUrl: null, facebookUrl: null, navbarItems: [], footerColumns: [] }}>
        <ProductCard product={productSemImagem} />
      </SiteSettingsContext.Provider>,
    )
    const img = screen.getByRole('img', { name: /mechanical keyboard/i })
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/ph.jpg')
  })

  it('renderiza SVG de fallback quando imageUrls e placeholderImageUrl são vazios/nulos', () => {
    render(<ProductCard product={productSemImagem} />)
    const fallback = screen.getByRole('img', { name: /mechanical keyboard/i })
    expect(fallback.tagName.toLowerCase()).toBe('div')
    expect(fallback.querySelector('svg')).toBeInTheDocument()
  })
})
