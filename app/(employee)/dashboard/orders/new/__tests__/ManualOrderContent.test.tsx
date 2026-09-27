import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => '/dashboard/orders/new',
  useSearchParams: () => new URLSearchParams(),
}))

import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import { ManualOrderContent } from '@/components/content/dashboard/sales/ManualOrderContent'
import { useAuthStore } from '@/stores/auth.store'
import type { Address, CustomerLookup, DistributionCenter, EmployeePermission, Product } from '@/types'

const ana: CustomerLookup = { id: 'c1', name: 'Ana Souza', email: 'ana@test.com', phone: '11988887777', cpf: null }
const laptop = {
  id: 'p1', name: 'Laptop', slug: 'laptop', price: 100, effectivePrice: 100, stockQuantity: 5,
  categories: [], imageUrls: [], freeShipping: false, active: true,
} as unknown as Product
const casa: Address = { id: 'a1', street: 'Rua A', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01310100', isDefault: true }
const cd: DistributionCenter = { id: 'dc1', name: 'CD Centro', street: 'Av. B', number: '10', district: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01310100', active: true }

let addresses: Address[] = []
let lastOrder: Record<string, unknown> | null = null
let lastCustomer: unknown = null
let lastQuote: unknown = null

const createdOrder = {
  id: 'ord-1', orderNumber: 42, customerName: 'Ana Souza', customerEmail: 'ana@test.com', status: 'PENDING',
  totalAmount: 120, paymentMethod: 'PIX', paymentStatus: 'PENDING', createdAt: '2026-09-23T10:00:00', itemCount: 1,
  items: [], address: casa, statusHistory: [], origin: 'STAFF', createdByName: 'Func',
  paymentCheckoutUrl: 'https://pagamento.pagbank.com.br/pagamento?code=abc',
}

const server = setupServer(
  http.get('/api/admin/manual-orders/customers', ({ request }) => {
    const search = new URL(request.url).searchParams.get('search') ?? ''
    return HttpResponse.json(search.toLowerCase().includes('ana') ? [ana] : [])
  }),
  http.post('/api/admin/manual-orders/customers', async ({ request }) => {
    lastCustomer = await request.json()
    return HttpResponse.json({ id: 'c2', name: 'Bia Lima', email: 'bia@test.com', phone: null, cpf: null }, { status: 201 })
  }),
  http.get('/api/admin/manual-orders/customers/:id/addresses', () => HttpResponse.json(addresses)),
  http.post('/api/admin/manual-orders/customers/:id/addresses', async ({ request }) => {
    const created = { ...(await request.json() as object), id: 'a2', isDefault: false } as Address
    addresses = [...addresses, created]
    return HttpResponse.json(created, { status: 201 })
  }),
  http.get('/api/catalog/products', () => HttpResponse.json({ content: [laptop], totalPages: 1 })),
  http.post('/api/admin/manual-orders/shipping-quote', async ({ request }) => {
    lastQuote = await request.json()
    return HttpResponse.json({ options: [{ serviceId: '1', carrierName: 'Correios', serviceName: 'PAC', price: 20, deliveryDays: 5 }], freeShipping: false })
  }),
  http.get('/api/site/distribution-centers', () => HttpResponse.json([cd])),
  http.get('/api/site/payment-methods', () => HttpResponse.json({ DELIVERY: ['PIX'], PICKUP: ['PIX', 'PAY_ON_PICKUP'] })),
  http.post('/api/admin/manual-orders', async ({ request }) => {
    lastOrder = await request.json() as Record<string, unknown>
    return HttpResponse.json(createdOrder, { status: 201 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  lastOrder = null
  lastCustomer = null
  lastQuote = null
  replaceMock.mockClear()
  pushMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

function setEmployee(permissions: EmployeePermission[], role: 'EMPLOYEE' | 'ADMIN' = 'EMPLOYEE') {
  useAuthStore.setState({
    accessToken: 'tok', isAuthenticated: true, role,
    user: {
      id: 'u-1', name: 'Func', email: 'f@test.com', role, permissions,
      phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null,
    },
  })
}

beforeEach(() => {
  addresses = [casa]
  setEmployee(['CREATE_ORDERS'])
})

function renderContent() {
  return render(
    <ToastProvider>
      <ManualOrderContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

type User = ReturnType<typeof userEvent.setup>

async function chooseAna(user: User) {
  await user.type(screen.getByLabelText(/buscar cliente/i), 'ana{Enter}')
  await user.click(await screen.findByRole('button', { name: /selecionar ana souza/i }))
}

async function addLaptop(user: User) {
  await user.type(screen.getByLabelText(/buscar produto/i), 'lap{Enter}')
  await user.click(await screen.findByRole('button', { name: /adicionar laptop/i }))
}

describe('ManualOrderContent — permissão', () => {
  it('sem CREATE_ORDERS → replace("/dashboard")', async () => {
    setEmployee(['MANAGE_ORDERS'])
    renderContent()

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/dashboard'))
  })
})

describe('ManualOrderContent — cliente', () => {
  it('as etapas seguintes só aparecem depois de escolher o cliente', async () => {
    const user = userEvent.setup()
    renderContent()

    expect(screen.queryByLabelText(/buscar produto/i)).not.toBeInTheDocument()
    await chooseAna(user)

    expect(screen.getByText('ana@test.com')).toBeInTheDocument()
    expect(screen.getByLabelText(/buscar produto/i)).toBeInTheDocument()
  })

  it('"Cadastrar cliente": 201 seleciona o cliente novo', async () => {
    const user = userEvent.setup()
    renderContent()

    await user.click(screen.getByRole('button', { name: /novo cliente/i }))
    const dialog = screen.getByRole('dialog', { name: /cadastrar cliente/i })
    await user.type(within(dialog).getByLabelText(/^nome/i), 'Bia Lima')
    await user.type(within(dialog).getByLabelText(/^e-mail/i), 'bia@test.com')
    await user.click(within(dialog).getByRole('button', { name: /cadastrar cliente/i }))

    await waitFor(() => expect(lastCustomer).toEqual({ name: 'Bia Lima', email: 'bia@test.com', phone: null, cpf: null, sendInvite: false }))
    expect(await screen.findByText('bia@test.com')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('"Cadastrar cliente": 409 mostra o cliente já cadastrado com "Usar este cliente"', async () => {
    server.use(http.post('/api/admin/manual-orders/customers', () =>
      HttpResponse.json({ status: 409, message: 'Já existe uma conta com o e-mail ana@test.com', customer: ana }, { status: 409 })))
    const user = userEvent.setup()
    renderContent()

    await user.click(screen.getByRole('button', { name: /novo cliente/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^nome/i), 'Ana')
    await user.type(within(dialog).getByLabelText(/^e-mail/i), 'ana@test.com')
    await user.click(within(dialog).getByRole('button', { name: /cadastrar cliente/i }))

    expect(await within(dialog).findByText(/já cadastrado/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /usar este cliente/i }))

    expect(await screen.findByText('ana@test.com')).toBeInTheDocument()
    expect(screen.getByLabelText(/buscar produto/i)).toBeInTheDocument()
  })
})

describe('ManualOrderContent — pedido com entrega, cobrando do cliente', () => {
  it('cota o frete dos itens, cria o pedido e mostra o link de pagamento', async () => {
    const user = userEvent.setup()
    renderContent()

    await chooseAna(user)
    expect(screen.queryByRole('radio', { name: /^entrega$/i })).not.toBeInTheDocument()
    await addLaptop(user)

    await user.click(screen.getByRole('radio', { name: /^entrega$/i }))
    await waitFor(() => expect(lastQuote).toEqual({ customerId: 'c1', addressId: 'a1', items: [{ productId: 'p1', quantity: 1 }] }))
    await user.click(await screen.findByRole('radio', { name: /correios — pac/i }))

    expect(screen.queryByRole('switch', { name: /pagamento já recebido/i })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^pix$/i })).toBeChecked()
    expect(screen.getByText(/total do pedido/i)).toHaveTextContent(/R\$\s*120,00/)

    await user.type(screen.getByLabelText(/observação/i), 'Pedido pelo WhatsApp')
    expect(screen.getByText('20/500')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /criar pedido/i }))

    await waitFor(() => expect(lastOrder).toEqual({
      customerId: 'c1', items: [{ productId: 'p1', quantity: 1 }], deliveryMethod: 'DELIVERY',
      addressId: 'a1', pickupLocationId: null, shippingServiceId: '1', paymentMethod: 'PIX',
      paymentReceived: false, notes: 'Pedido pelo WhatsApp',
    }))
    expect(await screen.findByText(/pedido #42 criado/i)).toBeInTheDocument()
    expect(screen.getByText('https://pagamento.pagbank.com.br/pagamento?code=abc')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copiar link de pagamento/i })).toBeInTheDocument()
    // Sem MANAGE_ORDERS, não há como abrir o detalhe
    expect(screen.queryByRole('button', { name: /ver pedido/i })).not.toBeInTheDocument()
  })

  it('cliente sem endereço: cadastra um no Dialog e ele fica selecionado', async () => {
    addresses = []
    const user = userEvent.setup()
    renderContent()

    await chooseAna(user)
    await addLaptop(user)
    await user.click(screen.getByRole('radio', { name: /^entrega$/i }))

    await user.click(await screen.findByRole('button', { name: /novo endereço/i }))
    const dialog = screen.getByRole('dialog', { name: /novo endereço/i })
    await user.type(within(dialog).getByLabelText(/rua/i), 'Rua Nova')
    await user.type(within(dialog).getByLabelText(/número/i), '20')
    await user.type(within(dialog).getByLabelText(/bairro/i), 'Bairro')
    await user.type(within(dialog).getByLabelText(/cidade/i), 'Campinas')
    await user.type(within(dialog).getByLabelText(/estado/i), 'SP')
    await user.type(within(dialog).getByLabelText(/cep/i), '13000000')
    await user.click(within(dialog).getByRole('button', { name: /adicionar endereço/i }))

    await waitFor(() => expect(lastQuote).toMatchObject({ addressId: 'a2' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('422 (estoque) → toast com a mensagem e o pedido não é dado como criado', async () => {
    server.use(http.post('/api/admin/manual-orders', () =>
      HttpResponse.json({ message: 'Estoque insuficiente para Laptop' }, { status: 422 })))
    const user = userEvent.setup()
    renderContent()

    await chooseAna(user)
    await addLaptop(user)
    await user.click(screen.getByRole('radio', { name: /retirada/i }))
    await user.click(screen.getByRole('button', { name: /criar pedido/i }))

    expect(await screen.findByText(/estoque insuficiente para laptop/i)).toBeInTheDocument()
    expect(screen.queryByText(/pedido #42 criado/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/buscar produto/i)).toBeInTheDocument()
  })
})

describe('ManualOrderContent — pagamento já recebido', () => {
  it('com MANAGE_PAYMENTS: retirada, pagamento recebido na hora e "Ver pedido" com MANAGE_ORDERS', async () => {
    setEmployee(['CREATE_ORDERS', 'MANAGE_PAYMENTS', 'MANAGE_ORDERS'])
    server.use(http.post('/api/admin/manual-orders', async ({ request }) => {
      lastOrder = await request.json() as Record<string, unknown>
      return HttpResponse.json({ ...createdOrder, status: 'CONFIRMED', paymentStatus: 'PAID', paymentCheckoutUrl: null }, { status: 201 })
    }))
    const user = userEvent.setup()
    renderContent()

    await chooseAna(user)
    await addLaptop(user)
    await user.click(screen.getByRole('radio', { name: /retirada/i }))
    await user.click(screen.getByRole('switch', { name: /pagamento já recebido/i }))
    await user.click(screen.getByRole('radio', { name: /cartão de crédito/i }))
    await user.click(screen.getByRole('button', { name: /criar pedido/i }))

    await waitFor(() => expect(lastOrder).toMatchObject({
      deliveryMethod: 'PICKUP', pickupLocationId: 'dc1', addressId: null, shippingServiceId: null,
      paymentMethod: 'CREDIT_CARD', paymentReceived: true, notes: null,
    }))
    await user.click(await screen.findByRole('button', { name: /ver pedido/i }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/orders/ord-1')
  })
})
