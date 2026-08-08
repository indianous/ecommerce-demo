import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { PaymentsContent } from '../PaymentsContent'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminOrderPage } from '@/types'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const mockPage: AdminOrderPage = {
  content: [
    {
      id: 'order-1',
      orderNumber: 42,
      customerName: 'Ana Lima',
      customerEmail: 'ana@test.com',
      status: 'PENDING',
      totalAmount: 150,
      paymentMethod: 'PIX',
      paymentStatus: 'PENDING',
      itemCount: 1,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
  page: 0,
  size: 50,
  totalElements: 1,
  totalPages: 1,
  last: true,
}

const server = setupServer(
  http.get('/api/admin/orders', () => HttpResponse.json(mockPage)),
  http.patch('/api/admin/orders/:id/payment-status', () =>
    HttpResponse.json({ ...mockPage.content[0], paymentStatus: 'FAILED' }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  pushMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
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
  })
})

function renderContent(basePath?: string) {
  return render(
    <ToastProvider>
      <PaymentsContent basePath={basePath} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('PaymentsContent — listagem', () => {
  it('lista pedidos com pagamento pendente', async () => {
    renderContent()
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('botão "Confirmar" navega para basePath/{id}/confirm (default)', async () => {
    renderContent()
    await screen.findByText('Ana Lima')
    await userEvent.click(screen.getByRole('button', { name: /confirmar pagamento do pedido 42/i }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/payments/order-1/confirm')
  })

  it('botão "Confirmar" navega respeitando basePath customizado', async () => {
    renderContent('/dashboard/admin/payments')
    await screen.findByText('Ana Lima')
    await userEvent.click(screen.getByRole('button', { name: /confirmar pagamento do pedido 42/i }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/admin/payments/order-1/confirm')
  })
})

describe('PaymentsContent — rejeição com motivo', () => {
  it('clique em "Rejeitar" abre um Dialog em vez de disparar PATCH imediatamente', async () => {
    let patchCalled = false
    server.use(
      http.patch('/api/admin/orders/:id/payment-status', () => {
        patchCalled = true
        return HttpResponse.json({})
      }),
    )
    renderContent()
    await screen.findByText('Ana Lima')

    await userEvent.click(screen.getByRole('button', { name: /rejeitar pagamento do pedido 42/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(patchCalled).toBe(false)
  })

  it('dentro do Dialog: "Confirmar rejeição" desabilitado sem motivo', async () => {
    renderContent()
    await screen.findByText('Ana Lima')
    await userEvent.click(screen.getByRole('button', { name: /rejeitar pagamento do pedido 42/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /confirmar rejeição/i })).toBeDisabled()
  })

  it('preenche motivo e confirma: PATCH com rejectionReason, pedido some da lista, toast de sucesso', async () => {
    let capturedBody: unknown = null
    server.use(
      http.patch('/api/admin/orders/:id/payment-status', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ ...mockPage.content[0], paymentStatus: 'FAILED' })
      }),
    )
    renderContent()
    await screen.findByText('Ana Lima')
    await userEvent.click(screen.getByRole('button', { name: /rejeitar pagamento do pedido 42/i }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/motivo da rejeição/i), 'Comprovante ilegível')
    await userEvent.click(within(dialog).getByRole('button', { name: /confirmar rejeição/i }))

    await waitFor(() => expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument())
    expect(capturedBody).toMatchObject({ status: 'FAILED', rejectionReason: 'Comprovante ilegível' })
    expect(await screen.findByRole('status')).toHaveTextContent(/rejeitado/i)
  })

  it('fecha o Dialog sem confirmar: nenhum PATCH é disparado', async () => {
    let patchCalled = false
    server.use(
      http.patch('/api/admin/orders/:id/payment-status', () => {
        patchCalled = true
        return HttpResponse.json({})
      }),
    )
    renderContent()
    await screen.findByText('Ana Lima')
    await userEvent.click(screen.getByRole('button', { name: /rejeitar pagamento do pedido 42/i }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /cancelar/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(patchCalled).toBe(false)
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
  })
})
