import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { CartDrawer } from '../CartDrawer'
import { useCartStore } from '@/stores/cart.store'

afterEach(async () => {
  await act(async () => {
    useCartStore.getState().clearCart()
  })
})

describe('CartDrawer', () => {
  it('renders a trigger button showing the item count', () => {
    useCartStore.getState().addItem({ productId: 'prod-1', name: 'Laptop', price: 2999 })
    render(<CartDrawer />)

    expect(screen.getByRole('button', { name: /carrinho.*1/i })).toBeInTheDocument()
  })

  it('opens the drawer with cart items when the trigger is clicked', async () => {
    useCartStore.getState().addItem({ productId: 'prod-1', name: 'Laptop', price: 2999 })
    const user = userEvent.setup()
    render(<CartDrawer />)

    await user.click(screen.getByRole('button', { name: /carrinho/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/laptop/i)).toBeInTheDocument()
  })

  it('shows an empty state inside the drawer when the cart has no items', async () => {
    const user = userEvent.setup()
    render(<CartDrawer />)

    await user.click(screen.getByRole('button', { name: /carrinho/i }))

    expect(await screen.findByText(/carrinho está vazio/i)).toBeInTheDocument()
  })

  it('links to the cart page', async () => {
    useCartStore.getState().addItem({ productId: 'prod-1', name: 'Laptop', price: 2999 })
    const user = userEvent.setup()
    render(<CartDrawer />)

    await user.click(screen.getByRole('button', { name: /carrinho/i }))

    expect(await screen.findByRole('link', { name: /ver carrinho/i })).toHaveAttribute('href', '/cart')
  })

  it('links to the checkout page', async () => {
    useCartStore.getState().addItem({ productId: 'prod-1', name: 'Laptop', price: 2999 })
    const user = userEvent.setup()
    render(<CartDrawer />)

    await user.click(screen.getByRole('button', { name: /carrinho/i }))

    expect(await screen.findByRole('link', { name: /finalizar compra/i })).toHaveAttribute('href', '/checkout')
  })

  it('ao abrir, revalida os preços do visitante e avisa quando um item saiu do carrinho', async () => {
    const refresh = vi.spyOn(useCartStore.getState(), 'refreshGuestPrices')
      .mockResolvedValue({ removed: ['Mouse'] })
    useCartStore.getState().addItem({ productId: 'prod-1', name: 'Laptop', price: 2999 })
    const user = userEvent.setup()
    render(<CartDrawer />)

    await user.click(screen.getByRole('button', { name: /carrinho/i }))

    expect(refresh).toHaveBeenCalled()
    expect(await screen.findByText(/mouse não está mais disponível e saiu do carrinho/i)).toBeInTheDocument()
    refresh.mockRestore()
  })

  it('quando mais de um item sai do carrinho, o aviso fica no plural', async () => {
    const refresh = vi.spyOn(useCartStore.getState(), 'refreshGuestPrices')
      .mockResolvedValue({ removed: ['Mouse', 'Teclado'] })
    const user = userEvent.setup()
    render(<CartDrawer />)

    await user.click(screen.getByRole('button', { name: /carrinho/i }))

    expect(await screen.findByText('Mouse, Teclado não estão mais disponíveis e saíram do carrinho.')).toBeInTheDocument()
    refresh.mockRestore()
  })
})
