import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import PagamentosPage from '../dashboard/payments/page'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminOrderResponse } from '@/types'

const replaceMock = vi.fn()
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}))

const mockOrder: AdminOrderResponse = {
  id: 'order-1',
  orderNumber: 42,
  customerName: 'Ana Lima',
  customerEmail: 'ana@test.com',
  status: 'CONFIRMED',
  totalAmount: 150,
  paymentMethod: 'PIX',
  paymentStatus: 'PENDING',
  createdAt: '2026-01-01T00:00:00Z',
  itemCount: 1,
}

const mockPage = {
  content: [mockOrder],
  totalElements: 1,
  totalPages: 1,
  size: 50,
  page: 0,
  last: true,
}

const server = setupServer(
  http.get('/api/admin/orders', () => HttpResponse.json(mockPage)),
  http.patch('/api/admin/orders/:id/payment-status', () =>
    HttpResponse.json({ ...mockOrder, paymentStatus: 'FAILED' }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  pushMock.mockClear()
  replaceMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

const authenticatedEmployee = {
  isAuthenticated: true,
  accessToken: 'mock-token',
  role: 'EMPLOYEE' as const,
  user: {
    id: '1',
    name: 'Func',
    email: 'func@test.com',
    role: 'EMPLOYEE' as const,
    permissions: ['MANAGE_PAYMENTS' as const],
  },
}

function renderPage() {
  return render(
    <ToastProvider>
      <PagamentosPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('PagamentosPage', () => {
  it('exibe heading "Gestão de Pagamentos"', async () => {
    useAuthStore.setState(authenticatedEmployee)
    await act(async () => { renderPage() })
    expect(screen.getByRole('heading', { name: /gestão de pagamentos/i })).toBeInTheDocument()
  })

  it('redireciona para /dashboard quando usuário não tem MANAGE_PAYMENTS', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      role: 'EMPLOYEE' as const,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE' as const, permissions: ['MANAGE_ORDERS' as const] },
    })
    await act(async () => { renderPage() })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})

describe('PagamentosPage — listagem', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('exibe Skeleton durante o fetch', () => {
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('exibe pedidos com pagamento pendente após carregamento', async () => {
    renderPage()
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument()
    expect(screen.getByText('ana@test.com')).toBeInTheDocument()
    expect(screen.getByText(/PIX/i)).toBeInTheDocument()
  })

  it('exibe mensagem quando não há pagamentos pendentes', async () => {
    server.use(
      http.get('/api/admin/orders', () =>
        HttpResponse.json({ content: [], totalElements: 0, totalPages: 0, size: 50, page: 0, last: true }),
      ),
    )
    renderPage()
    expect(await screen.findByText(/nenhum pagamento pendente/i)).toBeInTheDocument()
  })
})

describe('PagamentosPage — ações', () => {
  beforeEach(() => { useAuthStore.setState(authenticatedEmployee) })

  it('botão "Confirmar" navega para a página de confirmação', async () => {
    renderPage()
    await screen.findByText('Ana Lima')
    await userEvent.click(screen.getByRole('button', { name: /confirmar pagamento do pedido 42/i }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/payments/order-1/confirm')
  })

  it('botão "Rejeitar" abre Dialog pedindo motivo', async () => {
    renderPage()
    await screen.findByText('Ana Lima')
    await userEvent.click(screen.getByRole('button', { name: /rejeitar pagamento do pedido 42/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText(/motivo da rejeição/i)).toBeInTheDocument()
  })

  it('confirmar rejeição com motivo: chama PATCH com rejectionReason e remove pedido da lista', async () => {
    let captured: unknown = null
    server.use(
      http.patch('/api/admin/orders/:id/payment-status', async ({ request }) => {
        captured = await request.json()
        return HttpResponse.json({ ...mockOrder, paymentStatus: 'FAILED' })
      }),
    )
    renderPage()
    await screen.findByText('Ana Lima')
    await userEvent.click(screen.getByRole('button', { name: /rejeitar pagamento do pedido 42/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/motivo da rejeição/i), 'Comprovante ilegível')
    await userEvent.click(within(dialog).getByRole('button', { name: /confirmar rejeição/i }))

    expect(await screen.findByText(/nenhum pagamento pendente/i)).toBeInTheDocument()
    expect(captured).toMatchObject({ status: 'FAILED', rejectionReason: 'Comprovante ilegível' })
  })

  it('exibe toast de sucesso ao rejeitar', async () => {
    renderPage()
    await screen.findByText('Ana Lima')
    await userEvent.click(screen.getByRole('button', { name: /rejeitar pagamento do pedido 42/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/motivo da rejeição/i), 'Comprovante ilegível')
    await userEvent.click(within(dialog).getByRole('button', { name: /confirmar rejeição/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/rejeitado/i)
  })

  it('exibe toast de erro se rejeitar falhar', async () => {
    server.use(
      http.patch('/api/admin/orders/:id/payment-status', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    )
    renderPage()
    await screen.findByText('Ana Lima')
    await userEvent.click(screen.getByRole('button', { name: /rejeitar pagamento do pedido 42/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/motivo da rejeição/i), 'Comprovante ilegível')
    await userEvent.click(within(dialog).getByRole('button', { name: /confirmar rejeição/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao rejeitar/i)
  })
})
