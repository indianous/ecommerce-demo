import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
import type { Product } from '@/types'

const mockProduct: Product = {
  id: 'prod-1',
  categoryId: 'cat-1',
  categoryName: 'Eletrônicos',
  name: 'Teclado Mecânico',
  price: 499.9,
  stockQuantity: 10,
  active: true,
  status: 'AVAILABLE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

let products: Product[] = []
let lastStockPatchId = ''
let lastStockPatchBody: Record<string, unknown> = {}

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
  http.patch('/api/admin/products/:id/stock', async ({ request, params }) => {
    lastStockPatchId = params.id as string
    lastStockPatchBody = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...products.find((p) => p.id === params.id)!, stockQuantity: (lastStockPatchBody as { quantity: number }).quantity })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  lastStockPatchId = ''
  lastStockPatchBody = {}
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

  it('lista produtos com input de quantidade', async () => {
    renderStock()
    await screen.findByText('Teclado Mecânico')
    expect(screen.getByRole('spinbutton', { name: /quantidade teclado mecânico/i })).toBeInTheDocument()
  })

  it('salvar chama PATCH /api/admin/products/:id/stock com a quantidade correta', async () => {
    const user = userEvent.setup()
    renderStock()
    await screen.findByText('Teclado Mecânico')

    const input = screen.getByRole('spinbutton', { name: /quantidade teclado mecânico/i })
    fireEvent.change(input, { target: { value: '42' } })
    await user.click(screen.getByRole('button', { name: /salvar estoque teclado mecânico/i }))

    await waitFor(() => {
      expect(lastStockPatchId).toBe('prod-1')
      expect(lastStockPatchBody).toMatchObject({ quantity: 42 })
    })
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
