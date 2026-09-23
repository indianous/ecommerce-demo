import { act, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
}))

import { ToastProvider } from 'base-ds'
import { CustomerDetailContent } from '@/components/content/dashboard/people/CustomerDetailContent'
import { useAuthStore } from '@/stores/auth.store'

// Nascido em 1º de janeiro há 30 anos: o aniversário já passou em qualquer
// dia do ano em que o teste rodar, então a idade calculada é sempre 30.
const birthYear30YearsAgo = new Date().getFullYear() - 30

const mockDetail = {
  id: 'c-1',
  name: 'João Silva',
  email: 'joao@test.com',
  createdAt: '2024-01-01T00:00:00Z',
  phone: '11999998888',
  birthDate: `${birthYear30YearsAgo}-01-01`,
  gender: 'FEMININO',
  purchaseSummary: {
    totalOrders: 2,
    totalSpent: 349.8,
    lastPurchaseAt: '2026-08-10T00:00:00Z',
  },
  recentOrders: [
    { id: 'o-1', orderNumber: 1042, status: 'DELIVERED', totalAmount: 199.9, createdAt: '2026-08-10T00:00:00Z' },
    { id: 'o-2', orderNumber: 1030, status: 'PENDING', totalAmount: 149.9, createdAt: '2026-07-01T00:00:00Z' },
  ],
  reviews: [
    {
      id: 'r-1',
      productName: 'Teclado Mecânico',
      productId: 'p-1',
      rating: 5,
      comment: 'Excelente produto',
      createdAt: '2026-08-05T00:00:00Z',
    },
  ],
  wishlist: [
    {
      productId: 'p-2',
      productName: 'Mouse Sem Fio',
      imageUrl: null,
      price: 89.9,
      addedAt: '2026-08-12T00:00:00Z',
    },
  ],
  currentCart: [
    { productId: 'p-3', productName: 'Cabo USB-C', quantity: 2, unitPrice: 29.9, subtotal: 59.8 },
  ],
  cartTotal: 59.8,
  trafficSource: {
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'black-friday',
    referrer: 'https://google.com',
    landingPage: '/catalog',
    capturedAt: '2026-08-01T00:00:00Z',
  },
  recentPageViews: [
    { path: '/catalog/mouse-sem-fio', viewedAt: '2026-08-14T00:00:00Z' },
  ],
  recentlyViewedProducts: [
    { productId: 'p-4', productName: 'Headset Gamer', productSlug: 'headset-gamer', viewedAt: '2026-08-13T00:00:00Z' },
  ],
  addresses: [
    {
      id: 'a-1',
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 4',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000',
      isDefault: true,
    },
  ],
}

const server = setupServer(
  http.get('/api/admin/customers/:id', ({ params }) =>
    params.id === 'c-1'
      ? HttpResponse.json(mockDetail)
      : HttpResponse.json({ message: 'Not found' }, { status: 404 }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_CUSTOMERS'], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER', cpf: null },
  })
})

function renderDetail(id = 'c-1') {
  return render(
    <ToastProvider>
      <CustomerDetailContent id={id} />
    </ToastProvider>,
  )
}

describe('CustomerDetailContent', () => {
  it('exibe nome e email do cliente', async () => {
    renderDetail()
    expect(await screen.findByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('joao@test.com')).toBeInTheDocument()
  })

  it('exibe botão de copiar ao lado do nome, e-mail e telefone', async () => {
    renderDetail()
    await screen.findByText('João Silva')
    expect(screen.getByRole('button', { name: 'Copiar nome' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar e-mail' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar telefone' })).toBeInTheDocument()
  })

  it('exibe endereço com rua, número, bairro, cidade, estado e CEP', async () => {
    renderDetail()
    await screen.findByText('João Silva')
    expect(screen.getByText(/rua das flores.*123/i)).toBeInTheDocument()
    expect(screen.getByText(/centro.*são paulo.*sp/i)).toBeInTheDocument()
    expect(screen.getByText(/01000-000/i)).toBeInTheDocument()
  })

  it('exibe link "← Voltar" para /dashboard/customers', async () => {
    renderDetail()
    const link = await screen.findByRole('link', { name: /voltar/i })
    expect(link).toHaveAttribute('href', '/dashboard/customers')
  })

  // ── Dados pessoais (fase 21) ─────────────────────────────────────────────

  it('exibe telefone, data de nascimento, idade calculada e gênero mapeado', async () => {
    renderDetail()
    await screen.findByText('João Silva')

    expect(screen.getByText('11999998888')).toBeInTheDocument()
    expect(screen.getByText('01/01/' + birthYear30YearsAgo)).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('Feminino')).toBeInTheDocument()
    expect(screen.queryByText('FEMININO')).not.toBeInTheDocument()
  })

  it('exibe "Não informado" para telefone, data de nascimento e idade quando ausentes', async () => {
    server.use(
      http.get('/api/admin/customers/:id', () =>
        HttpResponse.json({ ...mockDetail, phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER', cpf: null }),
      ),
    )
    renderDetail()
    await screen.findByText('João Silva')

    expect(screen.getAllByText('Não informado')).toHaveLength(3)
    expect(screen.getByText('Prefiro não dizer')).toBeInTheDocument()
  })

  // ── Histórico comercial (fase 22) ────────────────────────────────────────

  it('exibe total de pedidos, total gasto formatado em BRL e data da última compra', async () => {
    renderDetail()
    await screen.findByText('João Silva')

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('R$ 349,80')).toBeInTheDocument()
    expect(screen.getByText('10/08/2026')).toBeInTheDocument()
  })

  it('lista os pedidos recentes com número, status e valor', async () => {
    renderDetail()
    await screen.findByText('João Silva')

    expect(screen.getByText('#1042')).toBeInTheDocument()
    expect(screen.getByText('Entregue')).toBeInTheDocument()
    expect(screen.getByText('R$ 199,90')).toBeInTheDocument()

    expect(screen.getByText('#1030')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
    expect(screen.getByText('R$ 149,90')).toBeInTheDocument()
  })

  it('lista as avaliações com nome do produto, nota e comentário', async () => {
    renderDetail()
    await screen.findByText('João Silva')

    expect(screen.getByText('Teclado Mecânico')).toBeInTheDocument()
    expect(screen.getByText('Excelente produto')).toBeInTheDocument()
  })

  it('mostra estado vazio quando não há pedidos nem avaliações', async () => {
    server.use(
      http.get('/api/admin/customers/:id', () =>
        HttpResponse.json({
          ...mockDetail,
          purchaseSummary: { totalOrders: 0, totalSpent: 0, lastPurchaseAt: null },
          recentOrders: [],
          reviews: [],
          wishlist: [],
          currentCart: [],
          cartTotal: 0,
          trafficSource: null,
          recentPageViews: [],
          recentlyViewedProducts: [],
        }),
      ),
    )
    renderDetail()
    await screen.findByText('João Silva')

    expect(screen.getByText(/nenhuma compra ainda/i)).toBeInTheDocument()
    expect(screen.getByText(/nenhuma avaliação ainda/i)).toBeInTheDocument()
    expect(screen.getByText(/nenhum favorito ainda/i)).toBeInTheDocument()
    expect(screen.getByText(/carrinho vazio no momento/i)).toBeInTheDocument()
    expect(screen.getByText(/origem não identificada/i)).toBeInTheDocument()
    expect(screen.getByText(/nenhuma navegação registrada/i)).toBeInTheDocument()
    expect(screen.getByText(/nenhum produto visualizado ainda/i)).toBeInTheDocument()
  })

  // ── Wishlist (fase 23) ───────────────────────────────────────────────────

  it('lista os produtos favoritados com nome, preço e data', async () => {
    renderDetail()
    await screen.findByText('João Silva')

    expect(screen.getByText('Mouse Sem Fio')).toBeInTheDocument()
    expect(screen.getByText('R$ 89,90')).toBeInTheDocument()
    expect(screen.getByText('12/08/2026')).toBeInTheDocument()
  })

  // ── Carrinho atual (fase 24) ─────────────────────────────────────────────

  it('mostra os itens do carrinho atual com quantidade e subtotal', async () => {
    renderDetail()
    await screen.findByText('João Silva')

    expect(screen.getByText('Cabo USB-C')).toBeInTheDocument()
    expect(screen.getByText('R$ 59,80')).toBeInTheDocument()
  })

  // ── Comportamento e tráfego (fase 25) ─────────────────────────────────────

  it('exibe a origem de tráfego capturada no cadastro', async () => {
    renderDetail()
    await screen.findByText('João Silva')

    expect(screen.getByText('google')).toBeInTheDocument()
    expect(screen.getByText('cpc')).toBeInTheDocument()
    expect(screen.getByText('black-friday')).toBeInTheDocument()
  })

  it('lista as páginas visitadas recentes com path e data', async () => {
    renderDetail()
    await screen.findByText('João Silva')

    expect(screen.getByText('/catalog/mouse-sem-fio')).toBeInTheDocument()
    expect(screen.getByText('14/08/2026')).toBeInTheDocument()
  })

  it('lista os produtos vistos recentemente com nome, link e data', async () => {
    renderDetail()
    await screen.findByText('João Silva')

    const link = screen.getByRole('link', { name: /headset gamer/i })
    expect(link).toHaveAttribute('href', '/catalog/headset-gamer')
    expect(screen.getByText('13/08/2026')).toBeInTheDocument()
  })

  it('exibe mensagem de erro quando cliente não é encontrado', async () => {
    renderDetail('nao-existe')
    expect(await screen.findByText(/não encontrado/i)).toBeInTheDocument()
  })

  it('redireciona para /dashboard quando usuário não tem MANAGE_CUSTOMERS', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER', cpf: null },
    })
    await act(async () => {
      render(<ToastProvider><CustomerDetailContent id="c-1" /></ToastProvider>)
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
