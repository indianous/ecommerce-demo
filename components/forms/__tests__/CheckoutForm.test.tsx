import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, ToastViewport } from 'base-ds'
import { CheckoutForm } from '../CheckoutForm'
import { useCartStore } from '@/stores/cart.store'
import { useAuthStore } from '@/stores/auth.store'
import type { Address, DistributionCenter, OrderResponse, PaymentMethodsByDelivery } from '@/types'

function renderCheckoutForm(props: React.ComponentProps<typeof CheckoutForm>) {
  return render(
    <ToastProvider>
      <CheckoutForm {...props} />
      <ToastViewport />
    </ToastProvider>,
  )
}

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

/** Pedido de um gateway que devolve código de pagamento (Stripe/PagSeguro). */
const mockOrder: OrderResponse = {
  id: 'order-1',
  orderNumber: 1,
  status: 'PENDING',
  totalAmount: 2999,
  paymentMethod: 'PIX',
  paymentStatus: 'PENDING',
  paymentId: 'PIX-ABC123',
  createdAt: '2026-06-29T00:00:00',
  items: [],
}

/** Pedido do pagamento manual: sem paymentId nem checkoutUrl. */
const manualPixOrder: OrderResponse = { ...mockOrder, paymentId: undefined }

const mockDistributionCenter: DistributionCenter = {
  id: 'dc-1',
  name: 'CD Zona Sul',
  street: 'Av. das Nações',
  number: '1000',
  district: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310100',
  active: true,
}

const withPixKey: PaymentMethodsByDelivery = { DELIVERY: ['PIX'], PICKUP: ['PIX', 'PAY_ON_PICKUP'] }
const withoutPixKey: PaymentMethodsByDelivery = { DELIVERY: [], PICKUP: ['PAY_ON_PICKUP'] }
const stripeMethods: PaymentMethodsByDelivery = {
  DELIVERY: ['PIX', 'CREDIT_CARD', 'BOLETO'],
  PICKUP: ['PIX', 'CREDIT_CARD', 'BOLETO'],
}

const siteSettings = {
  contactEmail: 'contato@loja.com',
  contactPhone: '+55 11 99999-9999',
  pixKey: '52998224725',
  pixKeyHolder: 'Loja do Jota',
  pixQrCodeUrl: 'https://cdn.example.com/qr.png',
}

const server = setupServer(
  http.post('/api/orders', () => HttpResponse.json(mockOrder, { status: 201 })),
  http.post('/api/shipping/calculate', () => HttpResponse.json({ freeShipping: true, options: [] })),
  http.get('/api/site/distribution-centers', () => HttpResponse.json([])),
  http.get('/api/site/payment-methods', () => HttpResponse.json(withPixKey)),
  http.get('/api/site/settings', () => HttpResponse.json(siteSettings)),
)

beforeAll(() => server.listen())
afterAll(() => server.close())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useCartStore.getState().clearCart()
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})

beforeEach(() => {
  useCartStore.getState().addItem({ productId: 'prod-1', name: 'Laptop', price: 2999 })
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
})

function useCenters(centers: DistributionCenter[]) {
  server.use(http.get('/api/site/distribution-centers', () => HttpResponse.json(centers)))
}

function usePaymentMethods(methods: PaymentMethodsByDelivery) {
  server.use(http.get('/api/site/payment-methods', () => HttpResponse.json(methods)))
}

describe('CheckoutForm', () => {
  it('renders address dropdown with provided addresses', () => {
    renderCheckoutForm({ addresses: [mockAddress] })
    expect(screen.getByLabelText(/endereço/i)).toBeInTheDocument()
    expect(screen.getByText(/Rua das Flores/)).toBeInTheDocument()
  })

  it('submits order and shows success state', async () => {
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByText(/frete grátis/i)
    await user.click(await screen.findByRole('button', { name: /finalizar/i }))

    expect(await screen.findByTestId('order-success')).toBeInTheDocument()
    expect(screen.getByText(/#1/)).toBeInTheDocument()
    expect(screen.getByText(/PIX-ABC123/)).toBeInTheDocument()
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('shows error message when order creation fails', async () => {
    server.use(
      http.post('/api/orders', () =>
        HttpResponse.json({ message: 'Estoque insuficiente' }, { status: 422 }),
      ),
    )
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByText(/frete grátis/i)
    await user.click(await screen.findByRole('button', { name: /finalizar/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Estoque insuficiente')
  })

  it('com Stripe, mostra o link "Continuar para pagamento" quando a resposta traz checkoutUrl', async () => {
    usePaymentMethods(stripeMethods)
    server.use(
      http.post('/api/orders', () =>
        HttpResponse.json({ ...mockOrder, checkoutUrl: 'https://checkout.stripe.com/cs_test_123' }, { status: 201 }),
      ),
    )
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByText(/frete grátis/i)
    await user.click(await screen.findByRole('button', { name: /finalizar/i }))

    expect(await screen.findByTestId('order-success')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /continuar para pagamento/i })
    expect(link).toHaveAttribute('href', 'https://checkout.stripe.com/cs_test_123')
  })

  it('não mostra link de pagamento quando checkoutUrl está ausente', async () => {
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByText(/frete grátis/i)
    await user.click(await screen.findByRole('button', { name: /finalizar/i }))

    expect(await screen.findByTestId('order-success')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /continuar para pagamento/i })).not.toBeInTheDocument()
  })

  it('disables submit button while request is in flight', async () => {
    let resolveResponse!: () => void
    server.use(
      http.post('/api/orders', () =>
        new Promise<Response>((resolve) => {
          resolveResponse = () => resolve(HttpResponse.json(mockOrder, { status: 201 }))
        }),
      ),
    )

    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByText(/frete grátis/i)
    const button = await screen.findByRole('button', { name: /finalizar/i })
    await waitFor(() => expect(button).toBeEnabled())
    const clickDone = user.click(button)

    await waitFor(() => expect(button).toBeDisabled())

    resolveResponse()
    await clickDone
  })
})

describe('CheckoutForm — formas de pagamento (chave PIX cadastrada)', () => {
  it('busca /api/site/payment-methods uma vez só, sem refazer a chamada ao trocar a entrega', async () => {
    let calls = 0
    server.use(
      http.get('/api/site/payment-methods', () => {
        calls += 1
        return HttpResponse.json(withPixKey)
      }),
    )
    useCenters([mockDistributionCenter])
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await user.click(await screen.findByLabelText(/retirar em uma loja/i))
    await user.click(screen.getByLabelText(/^entrega$/i))

    expect(calls).toBe(1)
  })

  it('com entrega, oferece só PIX (sem cartão, boleto nem "pagar na retirada")', async () => {
    renderCheckoutForm({ addresses: [mockAddress] })

    expect(await screen.findByRole('radio', { name: /^pix$/i })).toBeChecked()
    expect(screen.queryByRole('radio', { name: /cartão/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /boleto/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /pagar na retirada/i })).not.toBeInTheDocument()
  })

  it('com retirada, oferece PIX e "Pagar na retirada"', async () => {
    useCenters([mockDistributionCenter])
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await user.click(await screen.findByLabelText(/retirar em uma loja/i))

    expect(screen.getByRole('radio', { name: /^pix$/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /pagar na retirada/i })).toBeInTheDocument()
  })

  it('voltar pra entrega tira "Pagar na retirada" e a seleção cai pra PIX', async () => {
    useCenters([mockDistributionCenter])
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await user.click(await screen.findByLabelText(/retirar em uma loja/i))
    await user.click(screen.getByRole('radio', { name: /pagar na retirada/i }))
    await user.click(screen.getByLabelText(/^entrega$/i))

    expect(screen.queryByRole('radio', { name: /pagar na retirada/i })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^pix$/i })).toBeChecked()
  })

  it('envia no pedido a forma escolhida', async () => {
    useCenters([mockDistributionCenter])
    let sentBody: Record<string, unknown> = {}
    server.use(
      http.post('/api/orders', async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(manualPixOrder, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await user.click(await screen.findByLabelText(/retirar em uma loja/i))
    await user.click(screen.getByRole('radio', { name: /pagar na retirada/i }))
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

    await waitFor(() => expect(sentBody).toMatchObject({ paymentMethod: 'PAY_ON_PICKUP', deliveryMethod: 'PICKUP' }))
  })

  it('com Stripe, oferece PIX, cartão e boleto', async () => {
    usePaymentMethods(stripeMethods)
    renderCheckoutForm({ addresses: [mockAddress] })

    expect(await screen.findByRole('radio', { name: /^pix$/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /cartão/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /boleto/i })).toBeInTheDocument()
  })

  it('o botão de finalizar fica desabilitado enquanto as formas de pagamento carregam', async () => {
    let release!: () => void
    server.use(
      http.get('/api/site/payment-methods', () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(HttpResponse.json(withPixKey))
        }),
      ),
    )
    renderCheckoutForm({ addresses: [mockAddress] })

    expect(screen.getByRole('button', { name: /finalizar/i })).toBeDisabled()

    release()
    await waitFor(() => expect(screen.getByRole('button', { name: /finalizar/i })).toBeEnabled())
  })

  it('falha ao carregar as formas: mostra a mensagem de erro e mantém o botão desabilitado', async () => {
    server.use(http.get('/api/site/payment-methods', () => HttpResponse.json({}, { status: 500 })))
    renderCheckoutForm({ addresses: [mockAddress] })

    expect(await screen.findByText(/não foi possível carregar as formas de pagamento/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /finalizar/i })).toBeDisabled()
  })
})

describe('CheckoutForm — sem chave PIX cadastrada: só retirada com pagamento na retirada', () => {
  beforeEach(() => {
    usePaymentMethods(withoutPixKey)
    useCenters([mockDistributionCenter])
  })

  it('a entrega fica indisponível, a retirada vem selecionada e o aviso é exibido', async () => {
    renderCheckoutForm({ addresses: [mockAddress] })

    expect(await screen.findByText(/no momento, o pagamento é feito somente na retirada/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/^entrega$/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/centro de distribuição/i)).toBeInTheDocument()
    expect(screen.queryByText(/frete grátis/i)).not.toBeInTheDocument()
  })

  it('oferece só "Pagar na retirada", já marcada', async () => {
    renderCheckoutForm({ addresses: [mockAddress] })

    expect(await screen.findByRole('radio', { name: /pagar na retirada/i })).toBeChecked()
    expect(screen.queryByRole('radio', { name: /^pix$/i })).not.toBeInTheDocument()
  })

  it('finaliza o pedido como retirada + PAY_ON_PICKUP', async () => {
    let sentBody: Record<string, unknown> = {}
    server.use(
      http.post('/api/orders', async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...manualPixOrder, paymentMethod: 'PAY_ON_PICKUP', deliveryMethod: 'PICKUP', pickupLocation: mockDistributionCenter }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByRole('radio', { name: /pagar na retirada/i })
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

    await waitFor(() =>
      expect(sentBody).toMatchObject({ paymentMethod: 'PAY_ON_PICKUP', deliveryMethod: 'PICKUP', pickupLocationId: 'dc-1' }),
    )
  })

  it('sem chave e sem centro de retirada ativo: mensagem "nenhuma forma de pagamento disponível" e botão desabilitado', async () => {
    useCenters([])
    renderCheckoutForm({ addresses: [mockAddress] })

    expect(await screen.findByText(/nenhuma forma de pagamento disponível/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /finalizar/i })).toBeDisabled()
  })
})

describe('CheckoutForm — instruções de pagamento depois do pedido', () => {
  it('PIX manual: mostra chave, favorecido, QR Code, total, botão de copiar e onde enviar o comprovante; sem "Código de pagamento"', async () => {
    server.use(http.post('/api/orders', () => HttpResponse.json(manualPixOrder, { status: 201 })))
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByText(/frete grátis/i)
    await user.click(await screen.findByRole('button', { name: /finalizar/i }))

    const success = await screen.findByTestId('order-success')
    expect(await within(success).findByText('52998224725')).toBeInTheDocument()
    expect(within(success).getByText(/Loja do Jota/)).toBeInTheDocument()
    expect(within(success).getByAltText(/qr code do pix/i)).toHaveAttribute('src', 'https://cdn.example.com/qr.png')
    expect(within(success).getByText(/R\$\s?2\.999,00/)).toBeInTheDocument()
    expect(within(success).getByRole('button', { name: /copiar/i })).toBeInTheDocument()
    expect(within(success).getByRole('link', { name: /contato@loja\.com/i })).toHaveAttribute('href', 'mailto:contato@loja.com')
    expect(within(success).getByRole('link', { name: /whatsapp/i })).toHaveAttribute('href', 'https://wa.me/5511999999999')
    expect(within(success).queryByText(/código de pagamento/i)).not.toBeInTheDocument()
  })

  it('pagar na retirada: mostra o local de retirada e não pede comprovante', async () => {
    useCenters([mockDistributionCenter])
    usePaymentMethods(withoutPixKey)
    server.use(
      http.post('/api/orders', () =>
        HttpResponse.json(
          { ...manualPixOrder, paymentMethod: 'PAY_ON_PICKUP', deliveryMethod: 'PICKUP', pickupLocation: mockDistributionCenter },
          { status: 201 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByRole('radio', { name: /pagar na retirada/i })
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

    const success = await screen.findByTestId('order-success')
    expect(await within(success).findByText(/pague na retirada em CD Zona Sul/i)).toBeInTheDocument()
    expect(within(success).queryByText(/comprovante/i)).not.toBeInTheDocument()
  })
})

describe('CheckoutForm — retirada em centro de distribuição', () => {
  it('sem nenhum centro de distribuição ativo, a opção "Retirar em uma loja" nem aparece', async () => {
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByText(/frete grátis/i)
    expect(screen.queryByLabelText(/retirar em uma loja/i)).not.toBeInTheDocument()
  })

  it('com centro de distribuição ativo, mostra os Radio "Entrega"/"Retirar em uma loja"', async () => {
    useCenters([mockDistributionCenter])
    renderCheckoutForm({ addresses: [mockAddress] })

    expect(await screen.findByLabelText(/^entrega$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/retirar em uma loja/i)).toBeInTheDocument()
  })

  it('escolher "Retirar em uma loja" mostra Select de centros e esconde a etapa de frete', async () => {
    useCenters([mockDistributionCenter])
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await user.click(await screen.findByLabelText(/retirar em uma loja/i))

    expect(screen.getByLabelText(/centro de distribuição/i)).toBeInTheDocument()
    expect(screen.getByText(/CD Zona Sul — São Paulo\/SP/)).toBeInTheDocument()
    expect(screen.queryByText(/frete grátis/i)).not.toBeInTheDocument()
  })

  it('com "Retirar" escolhido, o total exibido não inclui frete', async () => {
    useCenters([mockDistributionCenter])
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await user.click(await screen.findByLabelText(/retirar em uma loja/i))

    expect(screen.getByText(/Total: R\$\s?2\.999,00/)).toBeInTheDocument()
  })

  it('handleSubmit manda deliveryMethod PICKUP e pickupLocationId em vez de shippingServiceId', async () => {
    useCenters([mockDistributionCenter])
    let sentBody: Record<string, unknown> = {}
    server.use(
      http.post('/api/orders', async ({ request }) => {
        sentBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(mockOrder, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await user.click(await screen.findByLabelText(/retirar em uma loja/i))
    await user.selectOptions(screen.getByLabelText(/centro de distribuição/i), 'dc-1')
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

    await waitFor(() => {
      expect(sentBody).toMatchObject({ deliveryMethod: 'PICKUP', pickupLocationId: 'dc-1' })
      expect(sentBody.shippingServiceId).toBeUndefined()
    })
  })

  it('com um único centro ativo, escolher "Retirar em uma loja" já habilita o botão sem reselecionar o Select', async () => {
    useCenters([mockDistributionCenter])
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await user.click(await screen.findByLabelText(/retirar em uma loja/i))

    expect(screen.getByRole('button', { name: /finalizar/i })).toBeEnabled()
  })
})
