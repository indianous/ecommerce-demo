import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}))
import { ToastProvider, ToastViewport } from 'base-ds'
import { OrderDetailContent } from '../dashboard/orders/[id]/OrderDetailContent'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminOrderDetailResponse, OrderStatus } from '@/types'

const mockDetail: AdminOrderDetailResponse = {
  id: 'o-1',
  orderNumber: 100,
  customerName: 'Ana Lima',
  customerEmail: 'ana@test.com',
  status: 'PENDING' as OrderStatus,
  totalAmount: 199.9,
  paymentMethod: 'PIX',
  paymentStatus: 'PAID',
  createdAt: '2024-01-01T00:00:00Z',
  itemCount: 1,
  items: [{ productId: 'p-1', productName: 'Teclado', quantity: 1, unitPrice: 199.9, subtotal: 199.9 }],
  address: {
    id: 'a-1',
    street: 'Rua A',
    number: '1',
    district: 'Centro',
    city: 'SP',
    state: 'SP',
    zipCode: '01000-000',
    isDefault: true,
  },
  statusHistory: [
    {
      id: 'h-1',
      fromStatus: null,
      toStatus: 'PENDING' as OrderStatus,
      changedByEmail: null,
      reason: 'Pedido criado',
      attachmentUrls: [],
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],
}

const mockDeliveredDetail: AdminOrderDetailResponse = {
  ...mockDetail,
  status: 'DELIVERED' as OrderStatus,
}

let lastPatchBody: unknown = null
let lastPostBody: unknown = null

const server = setupServer(
  http.get('/api/admin/orders/:id', () => HttpResponse.json(mockDetail)),
  http.patch('/api/admin/orders/:id/status', async ({ request }) => {
    lastPatchBody = await request.json()
    return HttpResponse.json({ ...mockDetail, status: 'CONFIRMED' })
  }),
  http.post('/api/admin/orders/:id/change-requests', async ({ request }) => {
    lastPostBody = await request.json()
    return HttpResponse.json({ id: 'cr-1', status: 'PENDING' }, { status: 201 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  lastPatchBody = null
  lastPostBody = null
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

function renderDetail(id = 'o-1') {
  return render(
    <ToastProvider>
      <OrderDetailContent id={id} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('OrderDetailContent', () => {
  it('exibe número do pedido, nome do cliente, status', async () => {
    renderDetail()
    expect(await screen.findByText(/100/)).toBeInTheDocument()
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
    expect(screen.getAllByText(/pendente/i).length).toBeGreaterThan(0)
  })

  it('exibe badge de status de pagamento', async () => {
    renderDetail()
    await screen.findByText('Ana Lima')
    expect(screen.getByText('Pago')).toBeInTheDocument()
  })

  it('pagamento rejeitado exibe o motivo', async () => {
    server.use(http.get('/api/admin/orders/:id', () => HttpResponse.json({
      ...mockDetail,
      paymentStatus: 'FAILED',
      paymentRejectionReason: 'Comprovante ilegível',
    })))
    renderDetail()
    await screen.findByText('Ana Lima')
    expect(screen.getByText('Rejeitado')).toBeInTheDocument()
    expect(screen.getByText(/comprovante ilegível/i)).toBeInTheDocument()
  })

  it('pagamento pago não exibe motivo de rejeição', async () => {
    renderDetail()
    await screen.findByText('Ana Lima')
    expect(screen.queryByText(/motivo:/i)).not.toBeInTheDocument()
  })

  it('exibe lista de itens com productName, quantity, unitPrice', async () => {
    renderDetail()
    expect(await screen.findByText('Teclado')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('exibe statusHistory com fromStatus→toStatus e reason', async () => {
    renderDetail()
    await screen.findByText('Teclado')
    expect(screen.getByText(/criação.*pendente/i)).toBeInTheDocument()
    expect(screen.getByText(/pedido criado/i)).toBeInTheDocument()
  })

  it('pedido PENDING exibe botões "Confirmar" e "Cancelar"', async () => {
    renderDetail()
    expect(await screen.findByRole('button', { name: /confirmar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('pedido DELIVERED não exibe botões de transição', async () => {
    server.use(http.get('/api/admin/orders/:id', () => HttpResponse.json(mockDeliveredDetail)))
    renderDetail()
    await screen.findByText('Ana Lima')
    expect(screen.queryByRole('button', { name: /confirmar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument()
  })

  it('clicar em "Confirmar" abre form de justificativa', async () => {
    const user = userEvent.setup()
    renderDetail()
    await user.click(await screen.findByRole('button', { name: /confirmar/i }))
    expect(screen.getByRole('textbox', { name: /justificativa/i })).toBeInTheDocument()
  })

  it('submeter form de justificativa chama PATCH /api/admin/orders/:id/status', async () => {
    const user = userEvent.setup()
    renderDetail()
    await user.click(await screen.findByRole('button', { name: /confirmar/i }))

    const textarea = screen.getByRole('textbox', { name: /justificativa/i })
    await user.type(textarea, 'Pagamento confirmado')
    await user.click(screen.getByRole('button', { name: /confirmar mudança/i }))

    await waitFor(() => {
      expect(lastPatchBody).toMatchObject({ status: 'CONFIRMED', reason: 'Pagamento confirmado' })
    })
  })

  it('exibe botão "Solicitar retrocesso" quando status não é terminal', async () => {
    renderDetail()
    expect(await screen.findByRole('button', { name: /solicitar retrocesso/i })).toBeInTheDocument()
  })

  it('submeter solicitação retroativa chama POST /api/admin/orders/:id/change-requests', async () => {
    const user = userEvent.setup()
    renderDetail()
    await user.click(await screen.findByRole('button', { name: /solicitar retrocesso/i }))

    const retroSelect = await screen.findByRole('combobox', { name: /estado destino/i })
    await user.selectOptions(retroSelect, 'SHIPPED')
    await user.type(screen.getByRole('textbox', { name: /justificativa/i }), 'Cliente pediu retrocesso')
    await user.click(screen.getByRole('button', { name: /enviar solicitação/i }))

    await waitFor(() => {
      expect(lastPostBody).toMatchObject({ justification: 'Cliente pediu retrocesso' })
    })
  })
})
