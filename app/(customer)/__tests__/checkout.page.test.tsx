import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import CheckoutPage from '../checkout/page'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import type { Address, ShippingQuoteResponse } from '@/types'

const mockAddress: Address = {
  id: 'addr-1',
  street: 'Rua das Flores',
  number: '123',
  district: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
  isDefault: true,
}

const defaultShippingResponse: ShippingQuoteResponse = {
  freeShipping: false,
  options: [
    { serviceId: 'svc-1', carrierName: 'Correios', serviceName: 'PAC', price: 20, deliveryDays: 5 },
    { serviceId: 'svc-2', carrierName: 'Correios', serviceName: 'SEDEX', price: 35, deliveryDays: 2 },
  ],
}

let shippingResponse: ShippingQuoteResponse | { message: string } = defaultShippingResponse
let shippingStatus = 200

const server = setupServer(
  http.get('/api/addresses', () => HttpResponse.json([mockAddress])),
  http.post('/api/cart/items', () =>
    HttpResponse.json({
      items: [{ productId: 'prod-1', productName: 'Laptop', imageUrl: null, unitPrice: 2999, quantity: 1, subtotal: 2999 }],
      total: 2999,
    }),
  ),
  http.post('/api/shipping/calculate', () => HttpResponse.json(shippingResponse, { status: shippingStatus })),
  http.post('/api/orders', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({
      id: 'order-1',
      orderNumber: 1,
      status: 'PENDING',
      totalAmount: 2999,
      paymentMethod: body.paymentMethod,
      paymentStatus: 'PENDING',
      createdAt: '2026-01-01T00:00:00Z',
      items: [],
    })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  shippingResponse = defaultShippingResponse
  shippingStatus = 200
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
    useCartStore.getState().clearCart()
  })
})
afterAll(() => server.close())

beforeEach(async () => {
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
  await act(async () => {
    await useCartStore.getState().addItem({ productId: 'prod-1', name: 'Laptop', price: 2999 })
  })
})

function renderCheckoutPage() {
  return render(
    <ToastProvider>
      <CheckoutPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('CheckoutPage', () => {
  it('shows a loading state before addresses load', () => {
    renderCheckoutPage()
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
  })

  it('renders the checkout form once addresses load', async () => {
    renderCheckoutPage()

    expect(await screen.findByText(/Rua das Flores/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /finalizar/i })).toBeInTheDocument()
  })

  it('shows the auth form when there is no access token', () => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false })
    renderCheckoutPage()

    expect(screen.getByRole('tab', { name: /entrar/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /criar conta/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /finalizar/i })).not.toBeInTheDocument()
  })
})

describe('CheckoutPage — frete', () => {
  it('ao carregar com um endereço já selecionado, dispara a cotação e mostra as opções', async () => {
    renderCheckoutPage()

    expect(await screen.findByLabelText(/correios — pac/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/correios — sedex/i)).toBeInTheDocument()
  })

  it('escolher uma opção de frete soma o valor ao total exibido', async () => {
    const user = userEvent.setup()
    renderCheckoutPage()

    await screen.findByLabelText(/correios — pac/i)
    expect(screen.getByText(/total: r\$\s?2\.999,00/i)).toBeInTheDocument()

    await user.click(screen.getByLabelText(/correios — pac/i))

    expect(screen.getByText(/total: r\$\s?3\.019,00/i)).toBeInTheDocument()
  })

  it('botão "Finalizar Pedido" fica desabilitado até uma opção de frete ser escolhida', async () => {
    renderCheckoutPage()

    await screen.findByLabelText(/correios — pac/i)
    expect(screen.getByRole('button', { name: /finalizar/i })).toBeDisabled()
  })

  it('carrinho 100% frete grátis: mostra "Frete grátis" sem opções, e não bloqueia o submit', async () => {
    shippingResponse = { freeShipping: true, options: [] }
    renderCheckoutPage()

    expect(await screen.findByText(/frete grátis/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/correios/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /finalizar/i })).not.toBeDisabled()
  })

  it('erro da cotação (produto com dado de envio incompleto) mostra mensagem em vez de travar a tela', async () => {
    shippingResponse = { message: 'Produtos com dados de envio pendentes: Laptop (peso, dimensões)' }
    shippingStatus = 400
    renderCheckoutPage()

    expect(await screen.findByText(/dados de envio pendentes/i)).toBeInTheDocument()
  })

  it('handleSubmit manda shippingServiceId no POST de criar pedido junto com addressId/paymentMethod', async () => {
    let capturedBody: Record<string, unknown> = {}
    server.use(
      http.post('/api/orders', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          id: 'order-1', orderNumber: 1, status: 'PENDING', totalAmount: 3019,
          paymentMethod: 'PIX', paymentStatus: 'PENDING', createdAt: '2026-01-01T00:00:00Z', items: [],
        })
      }),
    )
    const user = userEvent.setup()
    renderCheckoutPage()

    await user.click(await screen.findByLabelText(/correios — pac/i))
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

    await waitFor(() => {
      expect(capturedBody).toEqual({ addressId: 'addr-1', paymentMethod: 'PIX', shippingServiceId: 'svc-1' })
    })
  })

  it('carrinho 100% frete grátis: submit não manda shippingServiceId', async () => {
    shippingResponse = { freeShipping: true, options: [] }
    let capturedBody: Record<string, unknown> = {}
    server.use(
      http.post('/api/orders', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          id: 'order-1', orderNumber: 1, status: 'PENDING', totalAmount: 2999,
          paymentMethod: 'PIX', paymentStatus: 'PENDING', createdAt: '2026-01-01T00:00:00Z', items: [],
        })
      }),
    )
    const user = userEvent.setup()
    renderCheckoutPage()

    await screen.findByText(/frete grátis/i)
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

    await waitFor(() => {
      expect(capturedBody).toEqual({ addressId: 'addr-1', paymentMethod: 'PIX' })
    })
  })
})
