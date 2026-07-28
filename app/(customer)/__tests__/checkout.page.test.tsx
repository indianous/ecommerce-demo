import { act, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import CheckoutPage from '../checkout/page'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import type { Address } from '@/types'

const mockAddress: Address = {
  id: 'addr-1',
  street: 'Rua das Flores',
  number: '123',
  district: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
  isDefault: true,
}

const server = setupServer(
  http.get('/api/addresses', () => HttpResponse.json([mockAddress])),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
    useCartStore.getState().clearCart()
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
  useCartStore.getState().addItem({ productId: 'prod-1', name: 'Laptop', price: 2999 })
})

function renderCheckoutPage() {
  return render(
    <ToastProvider>
      <CheckoutPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('CheckoutPage', () => {
  it('shows a loading state before addresses load', () => {
    renderCheckoutPage()
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('renders the checkout form once addresses load', async () => {
    renderCheckoutPage()

    expect(await screen.findByText(/Rua das Flores/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /finalizar/i })).toBeInTheDocument()
  })

  it('shows the auth form when there is no access token', () => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false })
    renderCheckoutPage()

    expect(screen.getByRole('tab', { name: /entrar/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /criar conta/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /finalizar/i })).not.toBeInTheDocument()
  })
})
