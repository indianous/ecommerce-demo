import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}))
import { ToastProvider, ToastViewport } from 'base-ds'
import { OrderDetailContent } from '@/components/content/OrderDetailContent'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminOrderDetailResponse } from '@/types'

const baseDetail: AdminOrderDetailResponse = {
  id: 'o-1',
  orderNumber: 100,
  customerName: 'Ana Lima',
  customerEmail: 'ana@test.com',
  status: 'CONFIRMED',
  totalAmount: 199.9,
  paymentMethod: 'PIX',
  paymentStatus: 'PAID',
  createdAt: '2024-01-01T00:00:00Z',
  itemCount: 1,
  items: [{ productId: 'p-1', productName: 'Teclado', quantity: 1, unitPrice: 199.9, subtotal: 199.9 }],
  address: { id: 'a-1', street: 'Rua A', number: '1', district: 'Centro', city: 'SP', state: 'SP', zipCode: '01000-000', isDefault: true },
  statusHistory: [],
}

let detailToReturn: AdminOrderDetailResponse = baseDetail
let lastInvoicePostCount = 0

const server = setupServer(
  http.get('/api/admin/orders/:id', () => HttpResponse.json(detailToReturn)),
  http.post('/api/admin/orders/:id/invoice', () => {
    lastInvoicePostCount += 1
    return HttpResponse.json(
      { id: 'inv-1', orderId: 'o-1', status: 'ISSUED', accessKey: 'chave-123', danfeUrl: 'https://danfe/1' },
      { status: 201 },
    )
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  detailToReturn = baseDetail
  lastInvoicePostCount = 0
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PAYMENTS', 'MANAGE_ORDERS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const},
  })
})

function renderPage() {
  return render(
    <ToastProvider>
      <OrderDetailContent id="o-1" />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('OrderDetailContent — nota fiscal', () => {
  it('pedido sem nota emitida e pagamento PAID: botão "Emitir NF-e" habilitado; ao clicar, emite e mostra status/link do DANFE', async () => {
    const user = userEvent.setup()
    renderPage()

    const issueButton = await screen.findByRole('button', { name: /emitir nf-e/i })
    expect(issueButton).not.toBeDisabled()

    await user.click(issueButton)

    await waitFor(() => {
      expect(screen.getByText('Emitida')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /ver nota/i })).toHaveAttribute('href', 'https://danfe/1')
    expect(lastInvoicePostCount).toBe(1)
  })

  it('pedido com pagamento PENDING: botão desabilitado com explicação', async () => {
    detailToReturn = { ...baseDetail, paymentStatus: 'PENDING' }
    renderPage()

    const issueButton = await screen.findByRole('button', { name: /emitir nf-e/i })
    expect(issueButton).toBeDisabled()
    expect(screen.getByText(/só pode ser emitida após o pagamento ser aprovado/i)).toBeInTheDocument()
  })

  it('emissão retorna 400 (produto sem dado fiscal): toast de erro com a mensagem do backend', async () => {
    server.use(
      http.post('/api/admin/orders/:id/invoice', () =>
        HttpResponse.json(
          { message: 'Produtos com dados fiscais pendentes: Teclado (NCM, CFOP)', status: 400 },
          { status: 400 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    const issueButton = await screen.findByRole('button', { name: /emitir nf-e/i })
    await user.click(issueButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/dados fiscais pendentes/i)
    })
  })

  it('pedido que já tem nota ISSUED: mostra "Ver nota" sem opção de emitir de novo', async () => {
    detailToReturn = {
      ...baseDetail,
      invoice: { id: 'inv-1', orderId: 'o-1', status: 'ISSUED', accessKey: 'chave-123', danfeUrl: 'https://danfe/1' },
    }
    renderPage()

    expect(await screen.findByRole('link', { name: /ver nota/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /emitir nf-e/i })).not.toBeInTheDocument()
  })

  it('seção de nota fiscal não aparece para quem não tem MANAGE_PAYMENTS', async () => {
    useAuthStore.setState({
      accessToken: 'mock-token',
      isAuthenticated: true,
      user: { id: 'u-2', name: 'Func2', email: 'func2@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const},
    })
    renderPage()

    await screen.findByText('Ana Lima')
    expect(screen.queryByText(/nota fiscal/i)).not.toBeInTheDocument()
  })
})

describe('OrderDetailContent — dados de contato do cliente', () => {
  it('exibe botão de copiar ao lado do nome e do e-mail do cliente', async () => {
    renderPage()
    await screen.findByText('Ana Lima')
    expect(screen.getByRole('button', { name: 'Copiar nome do cliente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar e-mail do cliente' })).toBeInTheDocument()
  })
})
