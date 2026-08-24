import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()
let mockSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/orders',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

import OrdersPage from '../orders/page'
import { useAuthStore } from '@/stores/auth.store'
import type { OrderResponse } from '@/types'

function makeOrder(i: number, overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    id: `order-${i}`,
    orderNumber: i,
    status: 'PENDING',
    totalAmount: 100 + i,
    paymentMethod: 'PIX',
    paymentStatus: 'PENDING',
    createdAt: '2026-06-29T00:00:00',
    items: [],
    ...overrides,
  }
}

let ordersResponse: OrderResponse[] = [makeOrder(1)]

function paginatedHandler() {
  return http.get('/api/orders', ({ request }) => {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') ?? '0')
    const size = Number(searchParams.get('size') ?? '10')
    const start = page * size
    const content = ordersResponse.slice(start, start + size)
    return HttpResponse.json({
      content,
      page,
      size,
      totalElements: ordersResponse.length,
      totalPages: Math.max(1, Math.ceil(ordersResponse.length / size)),
      last: start + size >= ordersResponse.length,
    })
  })
}

const server = setupServer(paginatedHandler())

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  ordersResponse = [makeOrder(1)]
  mockSearch = ''
  pushMock.mockClear()
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
    ordersResponse = []
    render(<OrdersPage />)

    expect(await screen.findByText(/nenhum pedido/i)).toBeInTheDocument()
  })

  it('exibe o número do pedido formatado como #<orderNumber> na coluna Pedido', async () => {
    render(<OrdersPage />)

    expect(await screen.findByText('#1')).toBeInTheDocument()
    expect(screen.queryByText('order-1')).not.toBeInTheDocument()
  })

  it('renders the first page of orders with status', async () => {
    ordersResponse = Array.from({ length: 12 }, (_, i) => makeOrder(i + 1))
    render(<OrdersPage />)

    await screen.findByText('#1')
    expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0)
    expect(screen.queryByText('#11')).not.toBeInTheDocument()
  })

  it('clicking next page updates the URL to ?page=2', async () => {
    ordersResponse = Array.from({ length: 12 }, (_, i) => makeOrder(i + 1))
    const user = userEvent.setup()
    render(<OrdersPage />)

    await screen.findByText('#1')

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(pushMock).toHaveBeenCalledWith('/orders?page=2')
  })

  it('loading with ?page=2 in the URL fetches the second page directly', async () => {
    mockSearch = 'page=2'
    ordersResponse = Array.from({ length: 12 }, (_, i) => makeOrder(i + 1))
    render(<OrdersPage />)

    expect(await screen.findByText('#11')).toBeInTheDocument()
  })

  it('hides order items by default', async () => {
    ordersResponse = [
      makeOrder(1, {
        totalAmount: 500,
        items: [{ productId: 'p1', productName: 'Notebook', quantity: 2, unitPrice: 199.99, subtotal: 399.98 }],
      }),
    ]
    render(<OrdersPage />)
    await screen.findByText('#1')

    expect(screen.queryByText('Notebook')).not.toBeInTheDocument()
  })

  it('reveals order items when the expand button is clicked', async () => {
    const user = userEvent.setup()
    ordersResponse = [
      makeOrder(1, {
        totalAmount: 500,
        items: [{ productId: 'p1', productName: 'Notebook', quantity: 2, unitPrice: 199.99, subtotal: 399.98 }],
      }),
    ]
    render(<OrdersPage />)
    await screen.findByText('#1')

    await user.click(screen.getByRole('button', { name: /expand row/i }))

    expect(screen.getByText('Notebook')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/199,99/)).toBeInTheDocument()
  })

  it('links each order item to its product page in the catalog', async () => {
    const user = userEvent.setup()
    ordersResponse = [
      makeOrder(1, {
        totalAmount: 500,
        items: [{ productId: 'p1', productName: 'Notebook', quantity: 2, unitPrice: 199.99, subtotal: 399.98 }],
      }),
    ]
    render(<OrdersPage />)
    await screen.findByText('#1')

    await user.click(screen.getByRole('button', { name: /expand row/i }))

    expect(screen.getByRole('link', { name: 'Notebook' })).toHaveAttribute('href', '/catalog/p1')
  })

  it('collapses order items when the expand button is clicked again', async () => {
    const user = userEvent.setup()
    ordersResponse = [
      makeOrder(1, {
        totalAmount: 500,
        items: [{ productId: 'p1', productName: 'Notebook', quantity: 2, unitPrice: 199.99, subtotal: 399.98 }],
      }),
    ]
    render(<OrdersPage />)
    await screen.findByText('#1')

    await user.click(screen.getByRole('button', { name: /expand row/i }))
    expect(screen.getByText('Notebook')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /collapse row/i }))
    expect(screen.queryByText('Notebook')).not.toBeInTheDocument()
  })
})
