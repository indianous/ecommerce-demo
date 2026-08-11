import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

import { ToastProvider, ToastViewport } from 'base-ds'
import { StockContent } from '../dashboard/stock/StockContent'
import { useAuthStore } from '@/stores/auth.store'
import type { Product, StockLot } from '@/types'

const mockProduct: Product = {
  id: 'prod-1',
  categories: [{ id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' }],
  name: 'Teclado Mecânico',
  slug: 'teclado-mecanico',
  price: 499.9,
  stockQuantity: 10,
  active: true,
  status: 'AVAILABLE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockLots: StockLot[] = [
  { id: 'lot-1', productId: 'prod-1', productName: 'Teclado Mecânico', lotNumber: 'L1', quantity: 10, initialQuantity: 10, createdAt: '2024-01-01T00:00:00Z' },
]

let products: Product[] = []
let lastEntryBody: Record<string, unknown> = {}
let lastExitBody: Record<string, unknown> = {}

const makePage = (content: Product[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
  last: true,
})

const server = setupServer(
  http.get('/api/admin/products', () => HttpResponse.json(makePage(products))),
  http.get('/api/admin/products/:id/stock-lots', () =>
    HttpResponse.json({ content: mockLots, page: 0, size: 20, totalElements: mockLots.length, totalPages: 1, last: true }),
  ),
  http.post('/api/admin/products/:id/stock-movements/entries', async ({ request }) => {
    lastEntryBody = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ id: 'mv-1' }, { status: 201 })
  }),
  http.post('/api/admin/products/:id/stock-movements/exits', async ({ request }) => {
    lastExitBody = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ id: 'mv-2' }, { status: 201 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  lastEntryBody = {}
  lastExitBody = {}
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  products = [mockProduct]
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_STOCK'] },
  })
})

function renderStock() {
  return render(
    <ToastProvider>
      <StockContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('StockContent', () => {
  it('exibe heading "Gestão de Estoque"', async () => {
    renderStock()
    expect(await screen.findByRole('heading', { name: /gestão de estoque/i })).toBeInTheDocument()
  })

  it('lista produtos com estoque atual e link de histórico', async () => {
    renderStock()
    await screen.findByText('Teclado Mecânico')
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /histórico/i })).toHaveAttribute('href', '/dashboard/stock/prod-1')
  })

  it('botão Entrada abre o StockEntryForm e registra a movimentação', async () => {
    const user = userEvent.setup()
    renderStock()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /^entrada$/i }))
    const dialog = await screen.findByRole('dialog')
    const quantityInput = within(dialog).getByLabelText(/quantidade/i)
    await user.clear(quantityInput)
    await user.type(quantityInput, '20')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText(/sucesso/i)).toBeInTheDocument()
    expect(lastEntryBody).toMatchObject({ quantity: 20, reason: 'PURCHASE' })
  })

  it('botão Saída busca os lotes do produto e abre o StockExitForm', async () => {
    const user = userEvent.setup()
    renderStock()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /^saída$/i }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/L1/)).toBeInTheDocument()
  })

  it('registrar saída maior que o estoque disponível mostra toast de erro', async () => {
    server.use(
      http.post('/api/admin/products/:id/stock-movements/exits', () =>
        HttpResponse.json({ message: 'Estoque insuficiente' }, { status: 422 }),
      ),
    )
    const user = userEvent.setup()
    renderStock()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /^saída$/i }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/L1/)

    await user.selectOptions(within(dialog).getByLabelText(/lote/i), 'lot-1')
    const quantityInput = within(dialog).getByLabelText(/quantidade/i)
    await user.clear(quantityInput)
    await user.type(quantityInput, '5')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText(/estoque insuficiente/i)).toBeInTheDocument()
  })

  it('redireciona para /dashboard quando usuário não tem MANAGE_STOCK', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'] },
    })
    await act(async () => {
      render(<ToastProvider><StockContent /></ToastProvider>)
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
