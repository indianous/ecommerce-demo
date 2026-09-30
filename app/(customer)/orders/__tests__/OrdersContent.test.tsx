import { act, render, screen } from '@testing-library/react'
import { ToastProvider } from '@indianous/base-ds'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()
const replaceMock = vi.fn()
let mockSearch = ''
// Sempre o mesmo objeto, como no Next: um router novo a cada render faz o efeito do ?payment= rodar de novo (#25)
const routerMock = { push: pushMock, replace: replaceMock }
vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/orders',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

import { CustomerOrdersContent } from '@/components/content/store/CustomerOrdersContent'
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
  replaceMock.mockClear()
  mockSearch = ''
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  pushMock.mockClear()
  replaceMock.mockClear()
  mockSearch = ''
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
})

function renderContent() {
  return render(<CustomerOrdersContent />, { wrapper: ToastProvider })
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

describe('CustomerOrdersContent — como pagar (pagamento manual)', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/site/settings', () =>
        HttpResponse.json({
          contactEmail: 'contato@loja.com',
          contactPhone: '+55 11 99999-9999',
          pixKey: '52998224725',
          pixKeyHolder: 'Loja do Jota',
          pixQrCodeUrl: null,
        }),
      ),
    )
    useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
  })

  it('pedido PIX com pagamento pendente e sem paymentId mostra a chave PIX ao expandir', async () => {
    ordersResponse = [makeOrder({ status: 'PENDING', paymentStatus: 'PENDING', paymentMethod: 'PIX' })]
    render(<CustomerOrdersContent />, { wrapper: ToastProvider })

    await userEvent.click(await screen.findByRole('button', { name: /expand row/i }))

    expect(await screen.findByText('52998224725')).toBeInTheDocument()
    expect(screen.getByText(/envie o comprovante/i)).toBeInTheDocument()
  })

  it('pedido "pagar na retirada" pendente mostra o local de retirada', async () => {
    ordersResponse = [
      makeOrder({
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'PAY_ON_PICKUP',
        deliveryMethod: 'PICKUP',
        pickupLocation: {
          id: 'dc-1', name: 'CD Zona Sul', street: 'Av. das Nações', number: '1000', district: 'Centro',
          city: 'São Paulo', state: 'SP', zipCode: '01310100', active: true,
        },
      }),
    ]
    render(<CustomerOrdersContent />, { wrapper: ToastProvider })

    await userEvent.click(await screen.findByRole('button', { name: /expand row/i }))

    expect(await screen.findByText(/pague na retirada em CD Zona Sul/i)).toBeInTheDocument()
    expect(screen.getByText('Pagar na retirada')).toBeInTheDocument()
  })

  it('pedido com pagamento já confirmado não mostra "Como pagar"', async () => {
    ordersResponse = [makeOrder({ paymentStatus: 'PAID', paymentMethod: 'PIX' })]
    render(<CustomerOrdersContent />, { wrapper: ToastProvider })

    await userEvent.click(await screen.findByRole('button', { name: /expand row/i }))

    expect(await screen.findByText('Teclado Mecânico')).toBeInTheDocument()
    expect(screen.queryByText(/como pagar/i)).not.toBeInTheDocument()
  })
})

describe('CustomerOrdersContent — pagar agora e retorno do pagamento', () => {
  const soon = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString()
  const past = () => new Date(Date.now() - 3600 * 1000).toISOString()

  it('pedido pendente com link e validade futura mostra "Pagar agora" apontando pro checkout', async () => {
    ordersResponse = [
      makeOrder({ status: 'PENDING', paymentStatus: 'PENDING', paymentId: 'CHEC_1', checkoutUrl: 'https://pagamento.pagbank.com.br/x', paymentExpiresAt: soon() }),
    ]
    render(<CustomerOrdersContent />, { wrapper: ToastProvider })

    expect(await screen.findByRole('link', { name: /pagar agora/i })).toHaveAttribute('href', 'https://pagamento.pagbank.com.br/x')
  })

  it('validade vencida mostra "Checkout expirado" e não o link', async () => {
    ordersResponse = [
      makeOrder({ status: 'PENDING', paymentStatus: 'PENDING', paymentId: 'CHEC_1', checkoutUrl: 'https://pagamento.pagbank.com.br/x', paymentExpiresAt: past() }),
    ]
    render(<CustomerOrdersContent />, { wrapper: ToastProvider })

    expect(await screen.findByText(/checkout expirado/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /pagar agora/i })).not.toBeInTheDocument()
  })

  it('pagamento já confirmado ou sem link (manual) não mostra "Pagar agora"', async () => {
    ordersResponse = [makeOrder({ paymentStatus: 'PAID', checkoutUrl: undefined })]
    render(<CustomerOrdersContent />, { wrapper: ToastProvider })

    await screen.findByRole('cell', { name: '#10' })
    expect(screen.queryByRole('link', { name: /pagar agora/i })).not.toBeInTheDocument()
  })

  it('?payment=success mostra a mensagem de confirmação em andamento e limpa o parâmetro da URL', async () => {
    mockSearch = 'payment=success'
    render(<CustomerOrdersContent />, { wrapper: ToastProvider })

    expect(await screen.findByText(/recebemos seu pagamento/i)).toBeInTheDocument()
    expect(replaceMock).toHaveBeenCalledWith('/orders')
  })

  it('?payment=cancelled avisa que o pagamento não foi concluído e aponta pro "Pagar agora"', async () => {
    mockSearch = 'payment=cancelled'
    render(<CustomerOrdersContent />, { wrapper: ToastProvider })

    expect(await screen.findByText(/pagamento não concluído/i)).toBeInTheDocument()
  })

  it('sem o parâmetro, nenhuma mensagem de retorno e nenhum replace', async () => {
    render(<CustomerOrdersContent />, { wrapper: ToastProvider })

    await screen.findByRole('cell', { name: '#10' })
    expect(screen.queryByText(/recebemos seu pagamento|pagamento não concluído/i)).not.toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('limpar o parâmetro preserva os demais (ex.: page)', async () => {
    // 11 pedidos: a página 2 (tamanho 10) tem 1 pedido, e não cai no estado vazio
    ordersResponse = Array.from({ length: 11 }, (_, i) => makeOrder({ id: `order-${i + 1}`, orderNumber: i + 1 }))
    mockSearch = 'payment=success&page=2'
    render(<CustomerOrdersContent />, { wrapper: ToastProvider })

    await screen.findByText(/recebemos seu pagamento/i)
    expect(replaceMock).toHaveBeenCalledWith('/orders?page=2')
  })

  it('pedido com cupom mostra o desconto na coluna do total', async () => {
    ordersResponse = [makeOrder({ totalAmount: 179.91, discountAmount: 19.99, couponCode: 'DEZ' })]
    renderContent()

    expect(await screen.findByText(/desconto \(DEZ\): −\s*R\$\s*19,99/i)).toBeInTheDocument()
  })
})
