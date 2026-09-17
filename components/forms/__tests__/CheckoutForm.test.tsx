import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, ToastViewport } from 'base-ds'
import { CheckoutForm } from '../CheckoutForm'
import { useCartStore } from '@/stores/cart.store'
import { useAuthStore } from '@/stores/auth.store'
import type { Address, DistributionCenter, OrderResponse } from '@/types'

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

const server = setupServer(
  http.post('/api/orders', () => HttpResponse.json(mockOrder, { status: 201 })),
  http.post('/api/shipping/calculate', () => HttpResponse.json({ freeShipping: true, options: [] })),
  http.get('/api/site/distribution-centers', () => HttpResponse.json([])),
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

describe('CheckoutForm', () => {
  it('renders payment method options', () => {
    renderCheckoutForm({ addresses: [mockAddress] })
    expect(screen.getByLabelText(/pix/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cart/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/boleto/i)).toBeInTheDocument()
  })

  it('renders address dropdown with provided addresses', () => {
    renderCheckoutForm({ addresses: [mockAddress] })
    expect(screen.getByLabelText(/endereço/i)).toBeInTheDocument()
    expect(screen.getByText(/Rua das Flores/)).toBeInTheDocument()
  })

  it('submits order and shows success state', async () => {
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByText(/frete grátis/i)
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

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
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Estoque insuficiente')
  })

  it('mostra link "Continuar para pagamento" quando a resposta traz checkoutUrl', async () => {
    server.use(
      http.post('/api/orders', () =>
        HttpResponse.json({ ...mockOrder, checkoutUrl: 'https://checkout.stripe.com/cs_test_123' }, { status: 201 }),
      ),
    )
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByText(/frete grátis/i)
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

    expect(await screen.findByTestId('order-success')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /continuar para pagamento/i })
    expect(link).toHaveAttribute('href', 'https://checkout.stripe.com/cs_test_123')
  })

  it('não mostra link de pagamento quando checkoutUrl está ausente (Mock)', async () => {
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByText(/frete grátis/i)
    await user.click(screen.getByRole('button', { name: /finalizar/i }))

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
    const button = screen.getByRole('button', { name: /finalizar/i })
    const clickDone = user.click(button)

    await waitFor(() => expect(button).toBeDisabled())

    resolveResponse()
    await clickDone
  })
})

describe('CheckoutForm — retirada em centro de distribuição', () => {
  it('sem nenhum centro de distribuição ativo, a opção "Retirar em uma loja" nem aparece', async () => {
    renderCheckoutForm({ addresses: [mockAddress] })

    await screen.findByText(/frete grátis/i)
    expect(screen.queryByLabelText(/retirar em uma loja/i)).not.toBeInTheDocument()
  })

  it('com centro de distribuição ativo, mostra os Radio "Entrega"/"Retirar em uma loja"', async () => {
    server.use(http.get('/api/site/distribution-centers', () => HttpResponse.json([mockDistributionCenter])))
    renderCheckoutForm({ addresses: [mockAddress] })

    expect(await screen.findByLabelText(/^entrega$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/retirar em uma loja/i)).toBeInTheDocument()
  })

  it('escolher "Retirar em uma loja" mostra Select de centros e esconde a etapa de frete', async () => {
    server.use(http.get('/api/site/distribution-centers', () => HttpResponse.json([mockDistributionCenter])))
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await user.click(await screen.findByLabelText(/retirar em uma loja/i))

    expect(screen.getByLabelText(/centro de distribuição/i)).toBeInTheDocument()
    expect(screen.getByText(/CD Zona Sul — São Paulo\/SP/)).toBeInTheDocument()
    expect(screen.queryByText(/frete grátis/i)).not.toBeInTheDocument()
  })

  it('com "Retirar" escolhido, o total exibido não inclui frete', async () => {
    server.use(http.get('/api/site/distribution-centers', () => HttpResponse.json([mockDistributionCenter])))
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await user.click(await screen.findByLabelText(/retirar em uma loja/i))

    expect(screen.getByText(/Total: R\$\s?2\.999,00/)).toBeInTheDocument()
  })

  it('handleSubmit manda deliveryMethod PICKUP e pickupLocationId em vez de shippingServiceId', async () => {
    server.use(http.get('/api/site/distribution-centers', () => HttpResponse.json([mockDistributionCenter])))
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
    server.use(http.get('/api/site/distribution-centers', () => HttpResponse.json([mockDistributionCenter])))
    const user = userEvent.setup()
    renderCheckoutForm({ addresses: [mockAddress] })

    await user.click(await screen.findByLabelText(/retirar em uma loja/i))

    expect(screen.getByRole('button', { name: /finalizar/i })).toBeEnabled()
  })
})
