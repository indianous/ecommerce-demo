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
import { OrderDetailContent } from '@/components/content/dashboard/sales/OrderDetailContent'
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
let lastShippingLabelPostCount = 0

const server = setupServer(
  http.get('/api/admin/orders/:id', () => HttpResponse.json(detailToReturn)),
  http.post('/api/admin/orders/:id/invoice', () => {
    lastInvoicePostCount += 1
    return HttpResponse.json(
      { id: 'inv-1', orderId: 'o-1', status: 'ISSUED', accessKey: 'chave-123', danfeUrl: 'https://danfe/1' },
      { status: 201 },
    )
  }),
  http.post('/api/admin/orders/:id/shipping-label', () => {
    lastShippingLabelPostCount += 1
    return HttpResponse.json({ trackingCode: 'BR123456789BR', shippingLabelUrl: 'https://label.pdf' })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  detailToReturn = baseDetail
  lastInvoicePostCount = 0
  lastShippingLabelPostCount = 0
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PAYMENTS', 'MANAGE_ORDERS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
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

  it('com NEXT_PUBLIC_FISCAL_INVOICE_EMISSION_ENABLED=false, a seção de nota fiscal inteira não aparece', async () => {
    const original = process.env.NEXT_PUBLIC_FISCAL_INVOICE_EMISSION_ENABLED
    process.env.NEXT_PUBLIC_FISCAL_INVOICE_EMISSION_ENABLED = 'false'
    try {
      renderPage()

      await screen.findByText('Teclado')
      expect(screen.queryByText('Nota fiscal')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /emitir nf-e/i })).not.toBeInTheDocument()
    } finally {
      process.env.NEXT_PUBLIC_FISCAL_INVOICE_EMISSION_ENABLED = original
    }
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
      user: { id: 'u-2', name: 'Func2', email: 'func2@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
    })
    renderPage()

    await screen.findByText('Ana Lima')
    expect(screen.queryByText(/nota fiscal/i)).not.toBeInTheDocument()
  })
})

describe('OrderDetailContent — frete', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'mock-token',
      isAuthenticated: true,
      user: { id: 'u-3', name: 'Func3', email: 'func3@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_SHIPPING'], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null },
    })
  })

  it('mostra transportadora/serviço/custo quando presentes', async () => {
    detailToReturn = { ...baseDetail, shippingCarrierName: 'Correios', shippingServiceName: 'PAC', shippingCost: 20 }
    renderPage()

    expect(await screen.findByText(/correios — pac — r\$\s?20,00/i)).toBeInTheDocument()
  })

  it('sem trackingCode: botão "Comprar etiqueta" habilitado; ao clicar, compra e mostra rastreio + link', async () => {
    const user = userEvent.setup()
    renderPage()

    const buyButton = await screen.findByRole('button', { name: /comprar etiqueta/i })
    await user.click(buyButton)

    await waitFor(() => {
      expect(screen.getByText(/BR123456789BR/)).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /ver etiqueta/i })).toHaveAttribute('href', 'https://label.pdf')
    expect(lastShippingLabelPostCount).toBe(1)
  })

  it('já tem trackingCode: mostra rastreio sem o botão "Comprar etiqueta"', async () => {
    detailToReturn = { ...baseDetail, trackingCode: 'BR999', shippingLabelUrl: 'https://label2.pdf' }
    renderPage()

    expect(await screen.findByText(/BR999/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /comprar etiqueta/i })).not.toBeInTheDocument()
  })

  it('pedido com deliveryMethod=PICKUP mostra o nome/endereço do centro escolhido em vez de transportadora', async () => {
    detailToReturn = {
      ...baseDetail,
      deliveryMethod: 'PICKUP',
      pickupLocation: {
        id: 'dc-1', name: 'CD Zona Sul', street: 'Av. das Nações', number: '1000',
        district: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01310100', active: true,
      },
    }
    renderPage()

    expect(await screen.findByText(/retirada em: cd zona sul/i)).toBeInTheDocument()
    expect(screen.getByText(/av\. das nações, 1000/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /comprar etiqueta/i })).not.toBeInTheDocument()
  })

  it('seção de frete não aparece para quem não tem MANAGE_SHIPPING', async () => {
    useAuthStore.setState({
      accessToken: 'mock-token',
      isAuthenticated: true,
      user: { id: 'u-4', name: 'Func4', email: 'func4@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null },
    })
    renderPage()

    await screen.findByText('Ana Lima')
    expect(screen.queryByText('Frete')).not.toBeInTheDocument()
  })
})

describe('OrderDetailContent — dados de contato do cliente', () => {
  it('exibe botão de copiar ao lado do nome e do e-mail do cliente', async () => {
    renderPage()
    await screen.findByText('Ana Lima')
    expect(screen.getByRole('button', { name: 'Copiar nome do cliente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar e-mail do cliente' })).toBeInTheDocument()
  })

  it('pedido com cupom mostra o desconto abaixo do total', async () => {
    detailToReturn = { ...baseDetail, totalAmount: 179.91, discountAmount: 19.99, couponCode: 'DEZ' }
    renderPage()

    expect(await screen.findByText(/desconto \(DEZ\): −\s*R\$\s*19,99/i)).toBeInTheDocument()
  })
})

describe('OrderDetailContent — pedido registrado pela equipe', () => {
  it('mostra "Criado por" e a observação quando a origem é STAFF', async () => {
    detailToReturn = { ...baseDetail, origin: 'STAFF', createdByName: 'Vendedora', notes: 'Cliente pediu pelo WhatsApp' }
    renderPage()

    expect(await screen.findByText(/criado pela equipe: vendedora/i)).toBeInTheDocument()
    expect(screen.getByText('Cliente pediu pelo WhatsApp')).toBeInTheDocument()
  })

  it('pedido do site não mostra o bloco de origem', async () => {
    detailToReturn = { ...baseDetail, origin: 'WEB' }
    renderPage()

    await screen.findByText('Teclado')
    expect(screen.queryByText(/criado pela equipe/i)).not.toBeInTheDocument()
  })

  it('pagamento pendente com link: mostra o link com botão de copiar', async () => {
    detailToReturn = { ...baseDetail, paymentStatus: 'PENDING', paymentCheckoutUrl: 'https://pagamento.pagbank.com.br/pagamento?code=abc' }
    renderPage()

    expect(await screen.findByText('https://pagamento.pagbank.com.br/pagamento?code=abc')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copiar link de pagamento/i })).toBeInTheDocument()
  })

  it('pagamento já pago não mostra o link', async () => {
    detailToReturn = { ...baseDetail, paymentStatus: 'PAID', paymentCheckoutUrl: 'https://pagamento.pagbank.com.br/pagamento?code=abc' }
    renderPage()

    await screen.findByText('Teclado')
    expect(screen.queryByText(/pagamento\.pagbank/)).not.toBeInTheDocument()
  })
})
