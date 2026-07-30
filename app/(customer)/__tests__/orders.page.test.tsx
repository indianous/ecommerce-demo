import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import OrdersPage from '../orders/page'
import { useAuthStore } from '@/stores/auth.store'
import type { OrderResponse } from '@/types'

function makeOrder(i: number): OrderResponse {
  return {
    id: `order-${i}`,
    status: 'PENDING',
    totalAmount: 100 + i,
    paymentMethod: 'PIX',
    paymentStatus: 'PENDING',
    createdAt: '2026-06-29T00:00:00',
    items: [],
  }
}

const manyOrders = Array.from({ length: 7 }, (_, i) => makeOrder(i + 1))

const server = setupServer(http.get('/api/orders', () => HttpResponse.json(manyOrders)))

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
})

describe('OrdersPage', () => {
  it('shows an empty state when there are no orders', async () => {
    server.use(http.get('/api/orders', () => HttpResponse.json([])))
    render(<OrdersPage />)

    expect(await screen.findByText(/nenhum pedido/i)).toBeInTheDocument()
  })

  it('renders the first page of orders with status', async () => {
    render(<OrdersPage />)

    await screen.findByText('order-1')
    expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0)
    expect(screen.queryByText('order-6')).not.toBeInTheDocument()
  })

  it('paginates to the next page', async () => {
    const user = userEvent.setup()
    render(<OrdersPage />)

    await screen.findByText('order-1')

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(await screen.findByText('order-6')).toBeInTheDocument()
  })

  it('hides order items by default', async () => {
    server.use(
      http.get('/api/orders', () =>
        HttpResponse.json([
          {
            id: 'order-1',
            status: 'PENDING',
            totalAmount: 500,
            paymentMethod: 'PIX',
            paymentStatus: 'PENDING',
            createdAt: '2026-06-29T00:00:00',
            items: [{ productId: 'p1', productName: 'Notebook', quantity: 2, unitPrice: 199.99, subtotal: 399.98 }],
          },
        ]),
      ),
    )
    render(<OrdersPage />)
    await screen.findByText('order-1')

    expect(screen.queryByText('Notebook')).not.toBeInTheDocument()
  })

  it('reveals order items when the expand button is clicked', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/orders', () =>
        HttpResponse.json([
          {
            id: 'order-1',
            status: 'PENDING',
            totalAmount: 500,
            paymentMethod: 'PIX',
            paymentStatus: 'PENDING',
            createdAt: '2026-06-29T00:00:00',
            items: [{ productId: 'p1', productName: 'Notebook', quantity: 2, unitPrice: 199.99, subtotal: 399.98 }],
          },
        ]),
      ),
    )
    render(<OrdersPage />)
    await screen.findByText('order-1')

    await user.click(screen.getByRole('button', { name: /expandir order-1/i }))

    expect(screen.getByText('Notebook')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/199,99/)).toBeInTheDocument()
  })

  it('collapses order items when the expand button is clicked again', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/orders', () =>
        HttpResponse.json([
          {
            id: 'order-1',
            status: 'PENDING',
            totalAmount: 500,
            paymentMethod: 'PIX',
            paymentStatus: 'PENDING',
            createdAt: '2026-06-29T00:00:00',
            items: [{ productId: 'p1', productName: 'Notebook', quantity: 2, unitPrice: 199.99, subtotal: 399.98 }],
          },
        ]),
      ),
    )
    render(<OrdersPage />)
    await screen.findByText('order-1')

    await user.click(screen.getByRole('button', { name: /expandir order-1/i }))
    expect(screen.getByText('Notebook')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /expandir order-1/i }))
    expect(screen.queryByText('Notebook')).not.toBeInTheDocument()
  })
})
