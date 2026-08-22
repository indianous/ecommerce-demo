import { act, render, screen, waitFor, within } from '@testing-library/react'
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
  categories: [{ id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' }],
  name: 'Headset Antigo',
  slug: 'headset-antigo',
  price: 299.9,
  stockQuantity: 0,
  imageUrls: [],
  active: false,
  status: 'UNAVAILABLE',
  createdAt: '2023-06-01T00:00:00Z',
  updatedAt: '2024-03-15T10:00:00Z',
}

const mockDeletedProduct2: Product = {
  ...mockDeletedProduct,
  id: 'prod-deleted-2',
  name: 'Abajur Quebrado',
  updatedAt: '2023-01-10T10:00:00Z',
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

  it('clicar no cabeçalho "Nome" ordena as linhas (asc, depois desc)', async () => {
    deletedProducts = [mockDeletedProduct, mockDeletedProduct2]
    const user = userEvent.setup()
    renderDeleted()
    await screen.findByText('Headset Antigo')

    const header = screen.getByRole('columnheader', { name: 'Nome' })
    await user.click(within(header).getByRole('button'))
    let rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Abajur Quebrado')

    await user.click(within(header).getByRole('button'))
    rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Headset Antigo')
  })

  it('clicar no cabeçalho "Excluído em" ordena as linhas por data', async () => {
    deletedProducts = [mockDeletedProduct, mockDeletedProduct2]
    const user = userEvent.setup()
    renderDeleted()
    await screen.findByText('Headset Antigo')

    const header = screen.getByRole('columnheader', { name: 'Excluído em' })
    await user.click(within(header).getByRole('button'))
    const rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Abajur Quebrado')
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
