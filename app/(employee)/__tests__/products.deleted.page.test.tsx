import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

import { ToastProvider, ToastViewport } from 'base-ds'
import { DeletedProductsContent } from '../dashboard/products/deleted/DeletedProductsContent'
import { useAuthStore } from '@/stores/auth.store'
import type { Product } from '@/types'

const mockDeletedProduct: Product = {
  id: 'prod-deleted',
  categoryId: 'cat-1',
  categoryName: 'Eletrônicos',
  name: 'Headset Antigo',
  slug: 'headset-antigo',
  price: 299.9,
  stockQuantity: 0,
  active: false,
  status: 'UNAVAILABLE',
  createdAt: '2023-06-01T00:00:00Z',
  updatedAt: '2024-03-15T10:00:00Z',
}

let deletedProducts: Product[] = []
let lastRestoreId = ''

const makePage = (content: Product[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
  last: true,
})

const server = setupServer(
  http.get('/api/admin/products', () => HttpResponse.json(makePage(deletedProducts))),
  http.patch('/api/admin/products/:id/restore', ({ params }) => {
    lastRestoreId = params.id as string
    const restored = deletedProducts.find((p) => p.id === params.id)
    deletedProducts = deletedProducts.filter((p) => p.id !== params.id)
    return HttpResponse.json({ ...restored, active: true, status: 'UNAVAILABLE' })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  lastRestoreId = ''
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  deletedProducts = [mockDeletedProduct]
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['RESTORE_PRODUCTS'] },
  })
})

function renderDeleted() {
  return render(
    <ToastProvider>
      <DeletedProductsContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('DeletedProductsContent', () => {
  it('exibe heading "Produtos Excluídos"', async () => {
    renderDeleted()
    expect(await screen.findByRole('heading', { name: /produtos excluídos/i })).toBeInTheDocument()
  })

  it('lista produtos excluídos', async () => {
    renderDeleted()
    expect(await screen.findByText('Headset Antigo')).toBeInTheDocument()
  })

  it('botão Restaurar chama PATCH /restore e remove da lista', async () => {
    const user = userEvent.setup()
    renderDeleted()
    await screen.findByText('Headset Antigo')

    await user.click(screen.getByRole('button', { name: /restaurar headset antigo/i }))

    await waitFor(() => {
      expect(lastRestoreId).toBe('prod-deleted')
      expect(screen.queryByText('Headset Antigo')).not.toBeInTheDocument()
    })
  })

  it('redireciona para /dashboard quando usuário não tem RESTORE_PRODUCTS', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'] },
    })
    await act(async () => {
      render(<ToastProvider><DeletedProductsContent /></ToastProvider>)
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
