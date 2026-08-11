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
const mockCategory2: Category = { id: 'cat-2', name: 'Livros', slug: 'livros' }

const mockProduct: Product = {
  id: 'prod-1',
  categoryId: 'cat-1',
  categoryName: 'Eletrônicos',
  name: 'Teclado Mecânico',
  slug: 'teclado-mecanico',
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

const mockBookProduct: Product = {
  ...mockProduct,
  id: 'prod-2',
  categoryId: 'cat-2',
  categoryName: 'Livros',
  name: 'Livro de Receitas',
}

let products: Product[] = []

let lastPatchStatusBody: Record<string, unknown> = {}
let lastPatchStatusId = ''

const makePage = (content: Product[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
  last: true,
})

let categories: Category[] = []

const server = setupServer(
  http.get('/api/categories', () => HttpResponse.json(categories)),
  http.post('/api/admin/categories', () => HttpResponse.json({ id: 'cat-2', name: 'Eletrodomésticos', slug: 'eletrodomesticos' }, { status: 201 })),
  http.get('/api/admin/products', ({ request }) => {
    const url = new URL(request.url)
    const categoryId = url.searchParams.get('categoryId')
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    let filtered = products
    if (categoryId) filtered = filtered.filter((p) => p.categoryId === categoryId)
    if (status) filtered = filtered.filter((p) => p.status === status)
    if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    return HttpResponse.json(makePage(filtered))
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
  categories = [mockCategory]
  lastPatchStatusBody = {}
  lastPatchStatusId = ''
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

  it('não exibe abas "Estoque" ou "Excluídos" na página de produtos', async () => {
    renderPage()
    await screen.findByText('Teclado Mecânico')
    expect(screen.queryByRole('button', { name: /^estoque$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^excluídos$/i })).not.toBeInTheDocument()
  })

  it('exibe as colunas "Visualizações" e "Vendidos (30d)" com os valores de cada produto', async () => {
    products = [{ ...mockProduct, viewCount: 42, soldQuantityLast30Days: 7 }]
    renderPage()
    await screen.findByText('Teclado Mecânico')

    expect(screen.getByRole('columnheader', { name: /visualizações/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /vendidos \(30d\)/i })).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
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

describe('ProductsManagementPage — filtros', () => {
  it('filtro de categoria muda a lista exibida e chama a API com o categoryId esperado', async () => {
    categories = [mockCategory, mockCategory2]
    products = [mockProduct, mockBookProduct]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')
    expect(screen.getByText('Livro de Receitas')).toBeInTheDocument()

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filtrar por categoria/i }),
      'cat-2',
    )

    await waitFor(() => {
      expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Livro de Receitas')).toBeInTheDocument()
  })

  it('filtro de disponibilidade muda a lista exibida e chama a API com o status esperado', async () => {
    products = [mockProduct, mockUnavailableProduct]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')
    expect(screen.getByText('Mouse Óptico')).toBeInTheDocument()

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filtrar por disponibilidade/i }),
      'UNAVAILABLE',
    )

    await waitFor(() => {
      expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Mouse Óptico')).toBeInTheDocument()
  })

  it('selecionar "Todas as categorias" depois de filtrar volta a listar tudo', async () => {
    categories = [mockCategory, mockCategory2]
    products = [mockProduct, mockBookProduct]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filtrar por categoria/i }),
      'cat-2',
    )
    await waitFor(() => {
      expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()
    })

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filtrar por categoria/i }),
      '',
    )

    await waitFor(() => {
      expect(screen.getByText('Teclado Mecânico')).toBeInTheDocument()
    })
    expect(screen.getByText('Livro de Receitas')).toBeInTheDocument()
  })

  it('mantém o foco no campo de busca ao digitar, sem recarregar a página a cada letra', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    const searchInput = screen.getByRole('searchbox', { name: /buscar produtos/i })
    await user.click(searchInput)
    await user.type(searchInput, 'tec')

    expect(document.activeElement).toBe(searchInput)
    expect(searchInput).toHaveValue('tec')
    expect(screen.queryByText(/carregando produtos/i)).not.toBeInTheDocument()
  })
})

describe('ProductsManagementPage — criar categoria', () => {
  it('exibe botão "Nova categoria" para usuário com MANAGE_PRODUCTS', async () => {
    renderPage()
    await screen.findByText('Teclado Mecânico')
    expect(screen.getByRole('button', { name: /nova categoria/i })).toBeInTheDocument()
  })

  it('botão "Salvar" de categoria fica desabilitado sem nome', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /nova categoria/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('"Salvar" categoria chama POST, exibe toast de sucesso e atualiza filtro de categorias', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /nova categoria/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByRole('textbox'), 'Eletrodomésticos')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/categoria criada/i)
    expect(screen.getByRole('option', { name: 'Eletrodomésticos' })).toBeInTheDocument()
  })

  it('exibe toast de erro se o POST de categoria falhar', async () => {
    server.use(http.post('/api/admin/categories', () => HttpResponse.json({}, { status: 500 })))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /nova categoria/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByRole('textbox'), 'Eletrodomésticos')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao criar/i)
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
