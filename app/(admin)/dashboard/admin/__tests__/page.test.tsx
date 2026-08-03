import { act, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import AdminOrdersPage from '../orders/page'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminOrderResponse } from '@/types'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}))

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
  http.get('/api/admin/orders', () =>
    HttpResponse.json({ content: [mockOrder], totalElements: 1, totalPages: 1, size: 20, number: 0 }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  pushMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    role: 'ADMIN' as const,
    user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' as const, permissions: [] },
  })
})

function renderPage() {
  return render(
    <ToastProvider>
      <AdminOrdersPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('AdminOrdersPage — Gestão de Pedidos', () => {
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

  it('botão "Ver detalhe" navega para a rota de detalhe admin', async () => {
    renderPage()
    await screen.findByText('João Silva')

    const btn = screen.getByRole('button', { name: /ver detalhe do pedido 42/i })
    btn.click()

    expect(pushMock).toHaveBeenCalledWith('/dashboard/admin/orders/order-1')
  })
})
