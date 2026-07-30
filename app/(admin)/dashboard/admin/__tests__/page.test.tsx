import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import AdminDashboardPage from '../page'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminOrderResponse } from '@/types'

const mockOrder: AdminOrderResponse = {
  id: 'order-1',
  orderNumber: 42,
  customerName: 'João Silva',
  customerEmail: 'joao@test.com',
  status: 'PENDING',
  totalAmount: 2999,
  paymentMethod: 'PIX',
  paymentStatus: 'PENDING',
  createdAt: '2026-07-21T10:00:00',
  itemCount: 2,
}

const server = setupServer(
  http.get('/api/admin/orders', () => HttpResponse.json([mockOrder])),
  http.patch('/api/admin/orders/:id/status', () => HttpResponse.json({ ...mockOrder, status: 'CONFIRMED' })),
)

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

function renderPage() {
  return render(
    <ToastProvider>
      <AdminDashboardPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('AdminDashboardPage — Gestão de Pedidos', () => {
  it('exibe heading "Gestão de Pedidos"', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /gestão de pedidos/i })).toBeInTheDocument()
  })

  it('exibe Skeleton enquanto o fetch está pendente', () => {
    renderPage()
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument()
  })

  it('exibe a tabela de pedidos após o carregamento', async () => {
    renderPage()
    expect(await screen.findByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('joao@test.com')).toBeInTheDocument()
  })

  it('exibe toast de erro se o fetch falhar', async () => {
    server.use(http.get('/api/admin/orders', () => HttpResponse.json({}, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao carregar pedidos/i)
  })

  it('altera status do pedido ao acionar o select de status', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('João Silva')

    const select = screen.getByRole('combobox', { name: /status/i })
    await user.selectOptions(select, 'CONFIRMED')

    expect(await screen.findByText(/confirmed/i)).toBeInTheDocument()
  })
})
