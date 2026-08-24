import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { ProductCard } from '../ProductCard'
import { SiteSettingsContext } from '@/contexts/SiteSettingsContext'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import type { Product } from '@/types'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      {ui}
      <ToastViewport />
    </ToastProvider>,
  )
}

const wishlistServer = setupServer(
  http.post('/api/wishlist/:productId', () => new HttpResponse(null, { status: 204 })),
  http.delete('/api/wishlist/:productId', () => new HttpResponse(null, { status: 204 })),
)

beforeAll(() => wishlistServer.listen())
afterEach(async () => {
  wishlistServer.resetHandlers()
  await act(async () => {
    useCartStore.getState().clearCart()
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => wishlistServer.close())

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
  status: 'AVAILABLE',
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
}

describe('ProductCard', () => {
  it('renders product name', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)
    expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument()
  })

  it('renders formatted price in BRL', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)
    expect(screen.getByText(/499/)).toBeInTheDocument()
  })

  it('renders product image when imageUrls is provided', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)
    const img = screen.getByRole('img', { name: /mechanical keyboard/i })
    expect(img).toHaveAttribute('src', mockProduct.imageUrls[0])
  })

  it('renders category name', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)
    expect(screen.getByText('Electronics')).toBeInTheDocument()
  })

  it('shows out-of-stock indicator when stockQuantity is 0', () => {
    renderWithProviders(<ProductCard product={{ ...mockProduct, stockQuantity: 0 }} />)
    expect(screen.getByText(/sem estoque/i)).toBeInTheDocument()
  })

  it('renders "add to cart" button when product is in stock', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)
    expect(screen.getByRole('button', { name: /adicionar ao carrinho/i })).toBeInTheDocument()
  })

  it('adds the product to the cart store when the button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProductCard product={mockProduct} />)

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
    renderWithProviders(<ProductCard product={mockProduct} />)

    const btn = screen.getByRole('button', { name: /adicionar ao carrinho/i })
    await user.click(btn)
    await user.click(btn)

    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it('renderiza o card como link para a página de detalhe do produto, usando o slug', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)
    const link = screen.getByRole('link', { name: /mechanical keyboard/i })
    expect(link).toHaveAttribute('href', '/catalog/mechanical-keyboard')
  })

  it('mostra a nota média quando reviewCount > 0', () => {
    renderWithProviders(<ProductCard product={{ ...mockProduct, averageRating: 4.5, reviewCount: 3 }} />)
    expect(screen.getByRole('radiogroup', { name: /rating/i })).toBeInTheDocument()
  })

  it('não mostra nota quando reviewCount é 0', () => {
    renderWithProviders(<ProductCard product={{ ...mockProduct, averageRating: undefined, reviewCount: 0 }} />)
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
    renderWithProviders(<ProductCard product={promoProduct} />)

    expect(screen.getByText(/promoção/i)).toBeInTheDocument()
    expect(screen.getByText(/499,90/)).toBeInTheDocument()
    expect(screen.getByText(/399,90/)).toBeInTheDocument()
  })

  it('produto sem promoção mostra só o preço normal, sem badge', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)

    expect(screen.queryByText(/promoção/i)).not.toBeInTheDocument()
    expect(screen.getByText(/499,90/)).toBeInTheDocument()
  })

  it('adicionar ao carrinho um produto em promoção usa o effectivePrice', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProductCard product={promoProduct} />)

    await user.click(screen.getByRole('button', { name: /adicionar ao carrinho/i }))

    expect(useCartStore.getState().items[0]).toMatchObject({ price: 399.9 })
  })
})

describe('ProductCard — imagem placeholder', () => {
  const productSemImagem: Product = { ...mockProduct, imageUrls: [] }

  it('renderiza imagem do produto quando imageUrls está presente', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)
    const img = screen.getByRole('img', { name: /mechanical keyboard/i })
    expect(img).toHaveAttribute('src', mockProduct.imageUrls[0])
  })

  it('renderiza placeholder do contexto quando imageUrls é vazio', () => {
    renderWithProviders(
      <SiteSettingsContext.Provider value={{ placeholderImageUrl: 'https://cdn.example.com/ph.jpg', faviconUrl: null, logoUrl: null, instagramUrl: null, tiktokUrl: null, facebookUrl: null, navbarItems: [], footerColumns: [] }}>
        <ProductCard product={productSemImagem} />
      </SiteSettingsContext.Provider>,
    )
    const img = screen.getByRole('img', { name: /mechanical keyboard/i })
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/ph.jpg')
  })

  it('renderiza SVG de fallback quando imageUrls e placeholderImageUrl são vazios/nulos', () => {
    renderWithProviders(<ProductCard product={productSemImagem} />)
    const fallback = screen.getByRole('img', { name: /mechanical keyboard/i })
    expect(fallback.tagName.toLowerCase()).toBe('div')
    expect(fallback.querySelector('svg')).toBeInTheDocument()
  })
})

describe('ProductCard — wishlist', () => {
  it('usuário anônimo: não renderiza botão de favoritar', () => {
    renderWithProviders(<ProductCard product={mockProduct} />)
    expect(screen.queryByRole('button', { name: /favoritos/i })).not.toBeInTheDocument()
  })

  it('usuário autenticado, produto não favoritado: clique chama POST e passa pro estado favoritado', async () => {
    useAuthStore.setState({ accessToken: 'token', isAuthenticated: true })
    const user = userEvent.setup()
    renderWithProviders(<ProductCard product={{ ...mockProduct, isWishlisted: false }} />)

    const button = screen.getByRole('button', { name: /adicionar aos favoritos/i })
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /remover dos favoritos/i })).toBeInTheDocument()
    })
  })

  it('usuário autenticado, produto já favoritado: renderiza estado favoritado; clique chama DELETE e reverte', async () => {
    useAuthStore.setState({ accessToken: 'token', isAuthenticated: true })
    const user = userEvent.setup()
    renderWithProviders(<ProductCard product={{ ...mockProduct, isWishlisted: true }} />)

    expect(screen.getByRole('button', { name: /remover dos favoritos/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remover dos favoritos/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adicionar aos favoritos/i })).toBeInTheDocument()
    })
  })

  it('usuário autenticado: falha na chamada reverte o estado otimista', async () => {
    wishlistServer.use(
      http.post('/api/wishlist/:productId', () => HttpResponse.json({ message: 'Erro' }, { status: 500 })),
    )
    useAuthStore.setState({ accessToken: 'token', isAuthenticated: true })
    const user = userEvent.setup()
    renderWithProviders(<ProductCard product={{ ...mockProduct, isWishlisted: false }} />)

    await user.click(screen.getByRole('button', { name: /adicionar aos favoritos/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adicionar aos favoritos/i })).toBeInTheDocument()
    })
  })
})
