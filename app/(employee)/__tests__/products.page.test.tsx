import { act, render, screen, waitFor, within } from '@testing-library/react'
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
import ProductsManagementPage from '../dashboard/products/page'
import { useAuthStore } from '@/stores/auth.store'
import type { Category, Product } from '@/types'

const mockCategory: Category = { id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' }

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

const mockUnavailableProduct: Product = {
  ...mockProduct,
  id: 'prod-unavail',
  name: 'Mouse Óptico',
  status: 'UNAVAILABLE',
}

const mockDeletedProduct: Product = {
  id: 'prod-deleted',
  categoryId: 'cat-1',
  categoryName: 'Eletrônicos',
  name: 'Headset Antigo',
  price: 299.9,
  stockQuantity: 0,
  active: false,
  status: 'UNAVAILABLE',
  createdAt: '2023-06-01T00:00:00Z',
  updatedAt: '2024-03-15T10:00:00Z',
}

let products: Product[] = []
let deletedProducts: Product[] = []

let lastSavedBody: Record<string, unknown> = {}
let lastPatchStatusBody: Record<string, unknown> = {}
let lastPatchStatusId = ''
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
  http.get('/api/categories', () => HttpResponse.json([mockCategory])),
  http.get('/api/admin/products', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('active') === 'false') {
      return HttpResponse.json(makePage(deletedProducts))
    }
    return HttpResponse.json(makePage(products))
  }),
  http.post('/api/admin/products', async ({ request }) => {
    const body = (await request.json()) as Omit<Product, 'id'>
    lastSavedBody = body as Record<string, unknown>
    const created: Product = {
      ...(body as Product),
      id: 'prod-2',
      status: 'AVAILABLE',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }
    products = [...products, created]
    return HttpResponse.json(created, { status: 201 })
  }),
  http.put('/api/admin/products/:id', async ({ request, params }) => {
    const body = (await request.json()) as Product
    const updated = { ...body, id: params.id as string }
    products = products.map((p) => (p.id === params.id ? updated : p))
    return HttpResponse.json(updated)
  }),
  http.delete('/api/admin/products/:id', ({ params }) => {
    products = products.filter((p) => p.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
  http.patch('/api/admin/products/:id/status', async ({ request, params }) => {
    lastPatchStatusId = params.id as string
    lastPatchStatusBody = (await request.json()) as Record<string, unknown>
    const newStatus = lastPatchStatusBody.status as string
    const updated = products.find((p) => p.id === params.id)
      ? { ...products.find((p) => p.id === params.id)!, status: newStatus as Product['status'] }
      : mockProduct
    products = products.map((p) => (p.id === params.id ? updated : p))
    return HttpResponse.json(updated)
  }),
  http.patch('/api/admin/products/:id/restore', ({ params }) => {
    lastRestoreId = params.id as string
    const restored = deletedProducts.find((p) => p.id === params.id)
    deletedProducts = deletedProducts.filter((p) => p.id !== params.id)
    return HttpResponse.json({ ...restored, active: true, status: 'UNAVAILABLE' })
  }),
  http.post('/api/upload/image', () =>
    HttpResponse.json({ url: '/uploads/uuid-test.jpg' }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  pushMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  products = [mockProduct]
  deletedProducts = [mockDeletedProduct]
  lastSavedBody = {}
  lastPatchStatusBody = {}
  lastPatchStatusId = ''
  lastRestoreId = ''
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'] },
  })
})

function renderPage() {
  return render(
    <ToastProvider>
      <ProductsManagementPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('ProductsManagementPage — listagem', () => {
  it('renders existing products', async () => {
    renderPage()
    expect(await screen.findByText('Teclado Mecânico')).toBeInTheDocument()
  })

  it('exibe badge "Disponível" para produto com status=AVAILABLE', async () => {
    renderPage()
    await screen.findByText('Teclado Mecânico')
    const matches = screen.getAllByText('Disponível')
    expect(matches.some((el) => el.tagName !== 'OPTION')).toBe(true)
  })

  it('exibe badge "Indisponível" para produto com status=UNAVAILABLE', async () => {
    products = [mockUnavailableProduct]
    renderPage()
    await screen.findByText('Mouse Óptico')
    const matches = screen.getAllByText('Indisponível')
    expect(matches.some((el) => el.tagName !== 'OPTION')).toBe(true)
  })
})

describe('ProductsManagementPage — navegação', () => {
  it('botão "Novo produto" navega para /dashboard/products/new', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /novo produto/i }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/products/new')
  })

  it('botão "Editar" navega para /dashboard/products/:id/edit', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /editar teclado mecânico/i }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/products/prod-1/edit')
  })
})

describe('ProductsManagementPage — ações', () => {
  it('deletes a product', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /excluir teclado mecânico/i }))

    await waitFor(() => {
      expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()
    })
  })

  it('botão Excluir chama DELETE e remove produto da lista principal', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /excluir teclado mecânico/i }))

    await waitFor(() => {
      expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()
    })
  })

  it('produto AVAILABLE tem botão "Tornar Indisponível" que chama PATCH /status', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    const toggleBtn = screen.getByRole('button', { name: /tornar indisponível/i })
    expect(toggleBtn).toBeInTheDocument()
    await user.click(toggleBtn)

    await waitFor(() => {
      expect(lastPatchStatusId).toBe('prod-1')
      expect(lastPatchStatusBody).toMatchObject({ status: 'UNAVAILABLE' })
    })
  })

  it('produto UNAVAILABLE tem botão "Tornar Disponível" que chama PATCH /status', async () => {
    products = [mockUnavailableProduct]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Mouse Óptico')

    const toggleBtn = screen.getByRole('button', { name: /tornar disponível/i })
    expect(toggleBtn).toBeInTheDocument()
    await user.click(toggleBtn)

    await waitFor(() => {
      expect(lastPatchStatusId).toBe('prod-unavail')
      expect(lastPatchStatusBody).toMatchObject({ status: 'AVAILABLE' })
    })
  })
})

describe('ProductsManagementPage — aba Excluídos', () => {
  it('aba "Excluídos" não aparece para usuários sem RESTORE_PRODUCTS', async () => {
    renderPage() // beforeEach usa MANAGE_PRODUCTS
    await screen.findByText('Teclado Mecânico')
    expect(screen.queryByRole('button', { name: /excluídos/i })).not.toBeInTheDocument()
  })

  it('aba "Excluídos" aparece para usuários com RESTORE_PRODUCTS', async () => {
    useAuthStore.setState({
      accessToken: 'mock-token',
      isAuthenticated: true,
      user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['RESTORE_PRODUCTS'] },
    })
    renderPage()
    expect(await screen.findByRole('button', { name: /excluídos/i })).toBeInTheDocument()
  })

  it('aba "Excluídos" chama API com ?active=false e exibe produtos excluídos', async () => {
    useAuthStore.setState({
      accessToken: 'mock-token',
      isAuthenticated: true,
      user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['RESTORE_PRODUCTS'] },
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /excluídos/i }))

    expect(await screen.findByText('Headset Antigo')).toBeInTheDocument()
  })

  it('aba Excluídos exibe botão Restaurar que chama PATCH /restore', async () => {
    useAuthStore.setState({
      accessToken: 'mock-token',
      isAuthenticated: true,
      user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['RESTORE_PRODUCTS'] },
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /excluídos/i }))
    await screen.findByText('Headset Antigo')

    await user.click(screen.getByRole('button', { name: /restaurar/i }))

    await waitFor(() => {
      expect(lastRestoreId).toBe('prod-deleted')
      expect(screen.queryByText('Headset Antigo')).not.toBeInTheDocument()
    })
  })
})

describe('ProductsManagementPage — gestão de estoque', () => {
  it('"Atualizar estoque" não aparece para usuários sem MANAGE_STOCK', async () => {
    renderPage() // MANAGE_PRODUCTS
    await screen.findByText('Teclado Mecânico')
    expect(screen.queryByRole('button', { name: /atualizar estoque/i })).not.toBeInTheDocument()
  })

  it('"Atualizar estoque" aparece para usuários com MANAGE_STOCK', async () => {
    useAuthStore.setState({
      accessToken: 'mock-token',
      isAuthenticated: true,
      user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_STOCK'] },
    })
    renderPage()
    expect(await screen.findByRole('button', { name: /atualizar estoque/i })).toBeInTheDocument()
  })

  it('"Atualizar estoque" navega para /dashboard/products/:id/stock', async () => {
    useAuthStore.setState({
      accessToken: 'mock-token',
      isAuthenticated: true,
      user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_STOCK'] },
    })
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: /atualizar estoque/i }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/products/prod-1/stock')
  })
})


describe('ProductsManagementPage — controle de acesso', () => {
  it('redireciona para /dashboard quando usuário não tem permissão de produtos', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_CUSTOMERS'] },
    })
    await act(async () => {
      render(
        <ToastProvider>
          <ProductsManagementPage />
        </ToastProvider>,
      )
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
