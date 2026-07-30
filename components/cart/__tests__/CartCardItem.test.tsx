import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CartCardItem } from '../CartCardItem'
import { useCartStore } from '@/stores/cart.store'

const mockItem = {
  productId: 'prod-1',
  name: 'Mechanical Keyboard',
  price: 499.9,
  quantity: 2,
}

beforeEach(() => {
  useCartStore.getState().addItem({ productId: 'prod-1', name: 'Mechanical Keyboard', price: 499.9 })
  useCartStore.getState().updateQuantity('prod-1', 2)
})

afterEach(async () => {
  await act(async () => {
    useCartStore.getState().clearCart()
  })
})

describe('CartCardItem', () => {
  it('renders the product name and subtotal', () => {
    render(<CartCardItem item={mockItem} />)

    expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument()
    expect(screen.getByText(/999,80/)).toBeInTheDocument()
  })

  it('renders the current quantity as text', () => {
    render(<CartCardItem item={mockItem} />)

    expect(screen.getByText('Qtd: 2')).toBeInTheDocument()
  })

  it('removes the item from the store when the X button is clicked', async () => {
    const user = userEvent.setup()
    render(<CartCardItem item={mockItem} />)

    await user.click(screen.getByRole('button', { name: /remover mechanical keyboard/i }))

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(0)
    })
  })

  it('renders the product image when imageUrl is provided', () => {
    const itemWithImage = { ...mockItem, imageUrl: 'https://example.com/keyboard.jpg' }
    render(<CartCardItem item={itemWithImage} />)

    expect(screen.getByRole('img', { name: /mechanical keyboard/i })).toBeInTheDocument()
  })

  it('does not render an image element when imageUrl is absent', () => {
    render(<CartCardItem item={mockItem} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
