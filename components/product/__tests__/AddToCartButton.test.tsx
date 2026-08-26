import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { AddToCartButton } from '../AddToCartButton'
import { useCartStore } from '@/stores/cart.store'
import { useAuthStore } from '@/stores/auth.store'
import type { Product } from '@/types'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      {ui}
      <ToastViewport />
    </ToastProvider>,
  )
}

const server = setupServer()
beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useCartStore.getState().clearCart()
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

const mockProduct: Product = {
  id: 'prod-1',
  categories: [{ id: 'cat-1', name: 'Electronics', slug: 'electronics' }],
  name: 'Mechanical Keyboard',
  slug: 'mechanical-keyboard',
  price: 499.9,
  stockQuantity: 10,
  imageUrls: ['https://example.com/keyboard.jpg'],
  active: true,
  status: 'AVAILABLE',
  freeShipping: false,
  createdAt: '2026-06-29T00:00:00',
  updatedAt: '2026-06-29T00:00:00',
}

describe('AddToCartButton', () => {
  it('renderiza o botão "Adicionar ao carrinho" quando há estoque', () => {
    renderWithProviders(<AddToCartButton product={mockProduct} />)
    expect(screen.getByRole('button', { name: /adicionar ao carrinho/i })).toBeInTheDocument()
  })

  it('adiciona o produto ao carrinho ao clicar', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddToCartButton product={mockProduct} />)

    await user.click(screen.getByRole('button', { name: /adicionar ao carrinho/i }))

    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      productId: 'prod-1',
      name: 'Mechanical Keyboard',
      price: 499.9,
      imageUrl: 'https://example.com/keyboard.jpg',
      quantity: 1,
    })
  })

  it('incrementa a quantidade ao clicar duas vezes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddToCartButton product={mockProduct} />)

    const btn = screen.getByRole('button', { name: /adicionar ao carrinho/i })
    await user.click(btn)
    await user.click(btn)

    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it('mostra "Sem estoque" e não renderiza o botão quando stockQuantity é 0', () => {
    renderWithProviders(<AddToCartButton product={{ ...mockProduct, stockQuantity: 0 }} />)
    expect(screen.getByText(/sem estoque/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /adicionar ao carrinho/i })).not.toBeInTheDocument()
  })

  it('mostra "Produto indisponível" e não renderiza o botão quando active é false', () => {
    renderWithProviders(<AddToCartButton product={{ ...mockProduct, active: false, status: 'UNAVAILABLE' }} />)
    expect(screen.getByText(/produto indisponível/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /adicionar ao carrinho/i })).not.toBeInTheDocument()
  })

  it('mostra "Produto indisponível" quando status é UNAVAILABLE mesmo com active true', () => {
    renderWithProviders(<AddToCartButton product={{ ...mockProduct, status: 'UNAVAILABLE' }} />)
    expect(screen.getByText(/produto indisponível/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /adicionar ao carrinho/i })).not.toBeInTheDocument()
  })

  it('produto em promoção: adiciona ao carrinho usando o effectivePrice, não o price', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddToCartButton product={{ ...mockProduct, price: 499.9, effectivePrice: 399.9, onPromotion: true }} />)

    await user.click(screen.getByRole('button', { name: /adicionar ao carrinho/i }))

    expect(useCartStore.getState().items[0]).toMatchObject({ price: 399.9 })
  })
})

describe('AddToCartButton — falha de rede (usuário autenticado)', () => {
  it('erro de rede mostra toast e não incrementa o contador do carrinho', async () => {
    server.use(
      http.post('/api/cart/items', () => HttpResponse.json({ message: 'Erro' }, { status: 500 })),
    )
    await act(async () => {
      useAuthStore.setState({ accessToken: 'token', isAuthenticated: true })
    })

    const user = userEvent.setup()
    renderWithProviders(<AddToCartButton product={mockProduct} />)

    await user.click(screen.getByRole('button', { name: /adicionar ao carrinho/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/erro ao adicionar/i)
    })
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})
