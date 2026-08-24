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

import { CustomerOrdersContent } from '@/components/content/CustomerOrdersContent'
import { useAuthStore } from '@/stores/auth.store'
import type { OrderResponse } from '@/types'

function makeOrder(overrides: Partial<OrderResponse>): OrderResponse {
  return {
    id: 'order-1',
    orderNumber: 10,
    status: 'CONFIRMED',
    totalAmount: 199.9,
    paymentMethod: 'PIX',
    paymentStatus: 'PAID',
    createdAt: '2026-01-01T00:00:00Z',
    items: [{ productId: 'prod-1', productName: 'Teclado Mecânico', quantity: 1, unitPrice: 199.9, subtotal: 199.9 }],
    ...overrides,
  }
}

let ordersResponse: OrderResponse[] = [makeOrder({})]
let lastOrdersUrl = ''

const server = setupServer(
  http.get('/api/orders', ({ request }) => {
    lastOrdersUrl = request.url
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
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  ordersResponse = [makeOrder({})]
  lastOrdersUrl = ''
  pushMock.mockClear()
  mockSearch = ''
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
})

function renderContent() {
  return render(<CustomerOrdersContent />)
}

describe('CustomerOrdersContent (cliente)', () => {
  it('renderiza heading e a tabela de pedidos vinda da API', async () => {
    renderContent()
    expect(await screen.findByRole('cell', { name: '#10' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Meus Pedidos' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Pedido' })).toBeInTheDocument()
  })

  it('estado vazio mostra "Nenhum pedido encontrado."', async () => {
    ordersResponse = []
    renderContent()
    expect(await screen.findByText('Nenhum pedido encontrado.')).toBeInTheDocument()
  })

  it('clicar no botão de expandir mostra os itens do pedido, clicar de novo esconde', async () => {
    renderContent()
    await screen.findByRole('cell', { name: '#10' })

    expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /expand row/i }))
    expect(await screen.findByText('Teclado Mecânico')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Teclado Mecânico' })).toHaveAttribute('href', '/catalog/prod-1')

    await userEvent.click(screen.getByRole('button', { name: /collapse row/i }))
    expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()
  })
})

describe('CustomerOrdersContent (cliente) — paginação', () => {
  it('com totalPages<=1, não exibe navegação de página', async () => {
    renderContent()
    await screen.findByRole('cell', { name: '#10' })
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('busca inicial pede ?page=0&size=10 ao servidor (paginação real, não client-side)', async () => {
    ordersResponse = Array.from({ length: 15 }, (_, i) =>
      makeOrder({ id: `order-${i}`, orderNumber: 100 + i }),
    )
    renderContent()
    await screen.findByRole('cell', { name: '#100' })

    expect(screen.queryByRole('cell', { name: '#110' })).not.toBeInTheDocument()
    expect(new URL(lastOrdersUrl).searchParams.get('page')).toBe('0')
    expect(new URL(lastOrdersUrl).searchParams.get('size')).toBe('10')
  })

  it('URL com ?page=2 carrega a página 2 direto', async () => {
    mockSearch = 'page=2'
    ordersResponse = Array.from({ length: 15 }, (_, i) =>
      makeOrder({ id: `order-${i}`, orderNumber: 100 + i }),
    )
    renderContent()
    await screen.findByRole('cell', { name: '#110' })

    expect(new URL(lastOrdersUrl).searchParams.get('page')).toBe('1')
  })

  it('clicar em "Next page" atualiza a URL para ?page=2', async () => {
    ordersResponse = Array.from({ length: 15 }, (_, i) =>
      makeOrder({ id: `order-${i}`, orderNumber: 100 + i }),
    )
    renderContent()
    await screen.findByRole('cell', { name: '#100' })

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(pushMock).toHaveBeenCalledWith('/orders?page=2')
  })
})
