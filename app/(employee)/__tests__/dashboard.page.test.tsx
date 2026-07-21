import { act, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import DashboardPage from '../dashboard/page'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminOrderResponse } from '@/types'

const mockOrder: AdminOrderResponse = {
  id: 'order-1',
  customerName: 'João Silva',
  customerEmail: 'joao@test.com',
  status: 'PENDING',
  totalAmount: 2999,
  paymentMethod: 'PIX',
  paymentStatus: 'PENDING',
  paymentId: 'PIX-ABC',
  createdAt: '2026-06-29T10:00:00',
  itemCount: 2,
}

const server = setupServer(
  http.get('/api/admin/orders', () => HttpResponse.json([mockOrder])),
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

function renderDashboard() {
  return render(
    <ToastProvider>
      <DashboardPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('DashboardPage', () => {
  it('renders orders once loaded', async () => {
    renderDashboard()
    expect(await screen.findByText('João Silva')).toBeInTheDocument()
  })

  it('shows an error toast when fetching orders fails', async () => {
    server.use(http.get('/api/admin/orders', () => HttpResponse.json({}, { status: 500 })))
    renderDashboard()
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao carregar pedidos/i)
  })
})
