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
  http.get('/api/site/payment-methods', () => HttpResponse.json({ DELIVERY: ['PIX'], PICKUP: ['PIX', 'PAY_ON_PICKUP'] })),
  http.get('/api/site/distribution-centers', () => HttpResponse.json([])),
  http.get('/api/site/settings', () => HttpResponse.json({ pixKey: '52998224725' })),
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
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
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
    expect(screen.getByRole('status', { name: /carregando checkout/i })).toBeInTheDocument()
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

  it('equipe logada (plano 66, etapa 4): mostra a tela de entrar/cadastrar, como visitante', () => {
    useAuthStore.setState({ accessToken: 'token-staff', isAuthenticated: true, role: 'EMPLOYEE' })
    renderCheckoutPage()

    expect(screen.getByRole('tab', { name: /entrar/i })).toBeInTheDocument()
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

describe('CheckoutPage — cupom de desconto', () => {
  async function applyCoupon(user: ReturnType<typeof userEvent.setup>, code: string) {
    await user.type(await screen.findByLabelText(/cupom de desconto/i), code)
    await user.click(screen.getByRole('button', { name: /^aplicar$/i }))
  }

  it('aplicar um cupom válido mostra a linha de desconto e recalcula o total', async () => {
    let body: unknown = null
    server.use(http.post('/api/cart/coupon', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ code: 'DEZ', discountAmount: 299.9, subtotal: 2999 })
    }))
    const user = userEvent.setup()
    renderCheckoutPage()

    await user.click(await screen.findByLabelText(/correios — pac/i))
    await applyCoupon(user, 'dez')

    await waitFor(() => expect(body).toEqual({ code: 'dez' }))
    expect(await screen.findByText(/desconto \(DEZ\): −\s*R\$\s*299,90/i)).toBeInTheDocument()
    expect(screen.getByText(/total: R\$\s*2\.719,10/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remover cupom/i })).toBeInTheDocument()
  })

  it('cupom recusado mostra a mensagem do backend e não mexe no total', async () => {
    server.use(http.post('/api/cart/coupon', () => HttpResponse.json({ message: 'Cupom expirado' }, { status: 422 })))
    const user = userEvent.setup()
    renderCheckoutPage()

    await user.click(await screen.findByLabelText(/correios — pac/i))
    await applyCoupon(user, 'FOI')

    expect(await screen.findByText('Cupom expirado')).toBeInTheDocument()
    expect(screen.getByText(/total: R\$\s*3\.019,00/i)).toBeInTheDocument()
  })

  it('"Remover cupom" volta ao total sem desconto', async () => {
    server.use(http.post('/api/cart/coupon', () => HttpResponse.json({ code: 'DEZ', discountAmount: 299.9, subtotal: 2999 })))
    const user = userEvent.setup()
    renderCheckoutPage()

    await user.click(await screen.findByLabelText(/correios — pac/i))
    await applyCoupon(user, 'dez')
    await user.click(await screen.findByRole('button', { name: /remover cupom/i }))

    expect(screen.queryByText(/desconto \(DEZ\)/i)).not.toBeInTheDocument()
    expect(screen.getByText(/total: R\$\s*3\.019,00/i)).toBeInTheDocument()
  })

  it('o pedido vai com o couponCode aplicado', async () => {
    let orderBody: Record<string, unknown> = {}
    server.use(
      http.post('/api/cart/coupon', () => HttpResponse.json({ code: 'DEZ', discountAmount: 299.9, subtotal: 2999 })),
      http.post('/api/orders', async ({ request }) => {
        orderBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          id: 'order-1', orderNumber: 1, status: 'PENDING', totalAmount: 2719.1, discountAmount: 299.9, couponCode: 'DEZ',
          paymentMethod: 'PIX', paymentStatus: 'PENDING', createdAt: '2026-01-01T00:00:00Z', items: [],
        })
      }),
    )
    const user = userEvent.setup()
    renderCheckoutPage()

    await user.click(await screen.findByLabelText(/correios — pac/i))
    await applyCoupon(user, 'dez')
    await screen.findByText(/desconto \(DEZ\)/i)
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

    await waitFor(() => expect(orderBody).toEqual({
      addressId: 'addr-1', paymentMethod: 'PIX', shippingServiceId: 'svc-1', couponCode: 'DEZ',
    }))
  })

  it('422 no pedido com o cupom deixando de valer: revalida, tira o cupom, mostra a mensagem e não finaliza', async () => {
    let couponCalls = 0
    server.use(
      http.post('/api/cart/coupon', () => {
        couponCalls++
        return couponCalls === 1
          ? HttpResponse.json({ code: 'DEZ', discountAmount: 299.9, subtotal: 2999 })
          : HttpResponse.json({ message: 'Este cupom esgotou' }, { status: 422 })
      }),
      http.post('/api/orders', () => HttpResponse.json({ message: 'Este cupom esgotou' }, { status: 422 })),
    )
    const user = userEvent.setup()
    renderCheckoutPage()

    await user.click(await screen.findByLabelText(/correios — pac/i))
    await applyCoupon(user, 'dez')
    await screen.findByText(/desconto \(DEZ\)/i)
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

    expect(await screen.findAllByText('Este cupom esgotou')).not.toHaveLength(0)
    await waitFor(() => expect(screen.queryByText(/desconto \(DEZ\)/i)).not.toBeInTheDocument())
    expect(screen.queryByTestId('order-success')).not.toBeInTheDocument()
  })

  it('422 no pedido por outro motivo (estoque): o cupom continua aplicado', async () => {
    server.use(
      http.post('/api/cart/coupon', () => HttpResponse.json({ code: 'DEZ', discountAmount: 299.9, subtotal: 2999 })),
      http.post('/api/orders', () => HttpResponse.json({ message: 'Estoque insuficiente para Laptop' }, { status: 422 })),
    )
    const user = userEvent.setup()
    renderCheckoutPage()

    await user.click(await screen.findByLabelText(/correios — pac/i))
    await applyCoupon(user, 'dez')
    await screen.findByText(/desconto \(DEZ\)/i)
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

    expect(await screen.findAllByText(/estoque insuficiente/i)).not.toHaveLength(0)
    expect(screen.getByText(/desconto \(DEZ\)/i)).toBeInTheDocument()
  })
})

describe('CheckoutPage — e-mail não confirmado (plano 64)', () => {
  const customer = {
    id: 'u1', name: 'Bia', email: 'bia@test.com', role: 'CUSTOMER' as const, permissions: [],
    phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null,
  }

  it('cliente não verificado → Card "Confirme seu e-mail" no lugar do botão; endereço e frete continuam visíveis', async () => {
    useAuthStore.setState({ user: { ...customer, emailVerified: false } })
    renderCheckoutPage()

    expect(await screen.findByLabelText(/correios — pac/i)).toBeInTheDocument()
    expect(screen.getByText(/Rua das Flores/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Confirme seu e-mail para finalizar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reenviar e-mail/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /finalizar/i })).not.toBeInTheDocument()
  })

  it('403 EMAIL_NOT_VERIFIED no pedido → mostra o mesmo Card, sem toast genérico', async () => {
    useAuthStore.setState({ user: { ...customer, emailVerified: true } })
    server.use(http.post('/api/orders', () => HttpResponse.json(
      { status: 403, code: 'EMAIL_NOT_VERIFIED', message: 'Confirme seu e-mail para finalizar o pedido' },
      { status: 403 },
    )))
    const user = userEvent.setup()
    renderCheckoutPage()

    await user.click(await screen.findByLabelText(/correios — pac/i))
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

    expect(await screen.findByRole('heading', { name: 'Confirme seu e-mail para finalizar' })).toBeInTheDocument()
    expect(screen.queryByText('Confirme seu e-mail para finalizar o pedido')).not.toBeInTheDocument()
    expect(useAuthStore.getState().user?.emailVerified).toBe(false)
  })

  it('cliente verificado → botão "Finalizar Pedido" como hoje', async () => {
    useAuthStore.setState({ user: { ...customer, emailVerified: true } })
    renderCheckoutPage()

    await screen.findByLabelText(/correios — pac/i)
    expect(screen.getByRole('button', { name: /finalizar/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Confirme seu e-mail para finalizar' })).not.toBeInTheDocument()
  })
})
