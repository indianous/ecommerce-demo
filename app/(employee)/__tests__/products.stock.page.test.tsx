import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
import { ProductStockContent } from '../dashboard/products/[id]/stock/ProductStockContent'
import { useAuthStore } from '@/stores/auth.store'

const mockProduct = {
  id: 'prod-1',
  name: 'Teclado Mecânico',
  stockQuantity: 10,
  categoryId: 'cat-1',
  categoryName: 'Eletrônicos',
  price: 499.9,
  active: true,
  status: 'AVAILABLE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

let lastPatchBody: Record<string, unknown> = {}

const server = setupServer(
  http.get('/api/admin/products/:id', () => HttpResponse.json(mockProduct)),
  http.patch('/api/admin/products/:id/stock', async ({ request }) => {
    const body = await request.json()
    lastPatchBody = body as Record<string, unknown>
    return HttpResponse.json({ ...mockProduct, stockQuantity: (body as { quantity: number }).quantity })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  pushMock.mockClear()
  lastPatchBody = {}
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_STOCK'] },
  })
})

function renderStock(id = 'prod-1') {
  return render(
    <ToastProvider>
      <ProductStockContent id={id} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('ProductStockContent', () => {
  it('exibe heading "Atualizar Estoque"', async () => {
    renderStock()
    expect(await screen.findByRole('heading', { name: /atualizar estoque/i })).toBeInTheDocument()
  })

  it('exibe o nome do produto e o estoque atual', async () => {
    renderStock()
    expect(await screen.findByText('Teclado Mecânico')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('exibe link "← Voltar" para /dashboard/products', async () => {
    renderStock()
    const link = await screen.findByRole('link', { name: /voltar/i })
    expect(link).toHaveAttribute('href', '/dashboard/products')
  })

  it('submeter form envia PATCH /api/admin/products/:id/stock e navega de volta', async () => {
    const user = userEvent.setup()
    renderStock()

    const input = await screen.findByDisplayValue('10')
    fireEvent.change(input, { target: { value: '25' } })
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(lastPatchBody).toMatchObject({ quantity: 25 })
      expect(pushMock).toHaveBeenCalledWith('/dashboard/products')
    })
  })

  it('exibe mensagem quando produto não é encontrado', async () => {
    server.use(http.get('/api/admin/products/:id', () => new HttpResponse(null, { status: 404 })))
    renderStock('nao-existe')
    expect(await screen.findByText(/não encontrado/i)).toBeInTheDocument()
  })
})
