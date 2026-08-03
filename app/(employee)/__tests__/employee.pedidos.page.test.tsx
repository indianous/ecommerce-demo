import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))
import { ToastProvider, ToastViewport } from 'base-ds'
import PedidosPage from '../pedidos/page'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminOrderDetailResponse, AdminOrderResponse, OrderStatus } from '@/types'

const mockOrder: AdminOrderResponse = {
  id: 'o-1',
  orderNumber: 100,
  customerName: 'Ana Lima',
  customerEmail: 'ana@test.com',
  status: 'PENDING',
  totalAmount: 199.9,
  paymentMethod: 'PIX',
  paymentStatus: 'PAID',
  createdAt: '2024-01-01T00:00:00Z',
  itemCount: 2,
}

const mockOrderPage = {
  content: [mockOrder],
  totalPages: 1,
  totalElements: 1,
  size: 20,
  page: 0,
  last: true,
}

const mockDetail: AdminOrderDetailResponse = {
  ...mockOrder,
  items: [{ productId: 'p-1', productName: 'Teclado', quantity: 1, unitPrice: 199.9, subtotal: 199.9 }],
  address: { id: 'a-1', street: 'Rua A', number: '1', district: 'Centro', city: 'SP', state: 'SP', zipCode: '01000-000', isDefault: true },
  statusHistory: [{ id: 'h-1', fromStatus: null, toStatus: 'PENDING' as OrderStatus, changedByEmail: null, reason: 'Pedido criado', attachmentUrls: [], createdAt: '2024-01-01T00:00:00Z' }],
}

let lastOrdersUrl = ''

const server = setupServer(
  http.get('/api/admin/orders', ({ request }) => {
    lastOrdersUrl = request.url
    return HttpResponse.json(mockOrderPage)
  }),
  http.get('/api/admin/orders/:id', () => HttpResponse.json(mockDetail)),
  http.patch('/api/admin/orders/:id/status', () =>
    HttpResponse.json({ ...mockDetail, status: 'CONFIRMED' }),
  ),
  http.post('/api/admin/orders/:id/change-requests', () =>
    HttpResponse.json({ id: 'cr-1', status: 'PENDING' }, { status: 201 }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  lastOrdersUrl = ''
  replaceMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'] },
  })
})

function renderPage() {
  return render(
    <ToastProvider>
      <PedidosPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('PedidosPage — listagem', () => {
  it('exibe heading "Gestão de Pedidos"', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /gestão de pedidos/i })).toBeInTheDocument()
  })

  it('lista pedidos com número, cliente, badge de status', async () => {
    renderPage()
    expect(await screen.findByText('100')).toBeInTheDocument()
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
    expect(screen.getAllByText(/pendente/i).length).toBeGreaterThan(0)
  })

  it('campo de busca envia ?search= ao BFF', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Lima')

    await user.type(screen.getByRole('textbox', { name: /buscar/i }), 'Ana')

    await waitFor(() => {
      expect(lastOrdersUrl).toContain('search=Ana')
    })
  })

  it('select de status filtra por ?status=', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Lima')

    await user.selectOptions(screen.getByRole('combobox', { name: /status/i }), 'CONFIRMED')

    await waitFor(() => {
      expect(lastOrdersUrl).toContain('status=CONFIRMED')
    })
  })

  it('clicar em botão Ver detalhe exibe dados do pedido', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Lima')

    await user.click(screen.getByRole('button', { name: /ver detalhe/i }))

    expect(await screen.findByText('Teclado')).toBeInTheDocument()
  })
})

describe('PedidosPage — controle de acesso', () => {
  it('redireciona para /dashboard quando usuário não tem permissão de pedidos', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_CUSTOMERS'] },
    })
    await act(async () => {
      render(
        <ToastProvider>
          <PedidosPage />
        </ToastProvider>,
      )
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
