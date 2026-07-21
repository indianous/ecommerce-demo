import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import CartPage from '../cart/page'
import { useCartStore } from '@/stores/cart.store'

beforeEach(() => {
  useCartStore.getState().addItem({ productId: 'prod-1', name: 'Laptop', price: 2999 })
})

afterEach(async () => {
  await act(async () => {
    useCartStore.getState().clearCart()
  })
})

describe('CartPage', () => {
  it('shows an empty state with a link to the catalog when the cart has no items', () => {
    useCartStore.getState().clearCart()
    render(<CartPage />)

    expect(screen.getByText(/carrinho está vazio/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver catálogo/i })).toHaveAttribute('href', '/catalog')
  })

  it('renders cart items with quantity control and subtotal', () => {
    render(<CartPage />)

    expect(screen.getByText('Laptop')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveValue(1)
    expect(screen.getAllByText(/2\.999/).length).toBeGreaterThan(0)
  })

  it('removes an item when the remove button is clicked', async () => {
    const user = userEvent.setup()
    render(<CartPage />)

    await user.click(screen.getByRole('button', { name: /remover laptop/i }))

    await waitFor(() => {
      expect(screen.getByText(/carrinho está vazio/i)).toBeInTheDocument()
    })
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('updates quantity via the increment control', async () => {
    const user = userEvent.setup()
    render(<CartPage />)

    await user.click(screen.getByRole('button', { name: /increment/i }))

    await waitFor(() => {
      expect(useCartStore.getState().items[0]?.quantity).toBe(2)
    })
  })

  it('links to checkout', () => {
    render(<CartPage />)
    expect(screen.getByRole('link', { name: /finalizar pedido/i })).toHaveAttribute('href', '/checkout')
  })
})
