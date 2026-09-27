import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => '/dashboard/products',
  useSearchParams: () => new URLSearchParams(),
}))
import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import ProductsManagementPage from '../dashboard/products/page'
import { useAuthStore } from '@/stores/auth.store'
import type { Category, Product } from '@/types'

const mockCategory: Category = { id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' }
const mockCategory2: Category = { id: 'cat-2', name: 'Livros', slug: 'livros' }

const mockProduct: Product = {
  id: 'prod-1',
  categories: [mockCategory],
  name: 'Teclado Mecânico',
  slug: 'teclado-mecanico',
  price: 499.9,
  stockQuantity: 10,
  imageUrls: [],
  active: true,
  status: 'AVAILABLE',
  freeShipping: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockUnavailableProduct: Product = {
  ...mockProduct,
  id: 'prod-unavail',
  name: 'Mouse Óptico',
  status: 'UNAVAILABLE',
  freeShipping: false,
}

const mockBookProduct: Product = {
  ...mockProduct,
  id: 'prod-2',
  categories: [mockCategory2],
  name: 'Livro de Receitas',
}

let products: Product[] = []

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
  http.get('/api/admin/products', ({ request }) => {
    const url = new URL(request.url)
    const categoryIds = url.searchParams.getAll('categoryId')
    const statuses = url.searchParams.getAll('status')
    const search = url.searchParams.get('search')
    let filtered = products
    if (categoryIds.length > 0) filtered = filtered.filter((p) => p.categories.some((c) => categoryIds.includes(c.id)))
    if (statuses.length > 0) filtered = filtered.filter((p) => statuses.includes(p.status))
    if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    return HttpResponse.json(makePage(filtered))
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
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
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
    // "Estoque" também é o header (sortable) da coluna de quantidade em estoque —
    // só não pode existir como botão de aba fora da tabela.
    const estoqueButtons = screen.queryAllByRole('button', { name: /^estoque$/i })
    expect(estoqueButtons.every((btn) => btn.closest('table'))).toBe(true)
    expect(screen.queryByRole('button', { name: /^excluídos$/i })).not.toBeInTheDocument()
  })

  it('coluna "Categoria" mostra a categoria principal (primeira da lista) do produto', async () => {
    products = [{ ...mockProduct, categories: [mockCategory2, mockCategory] }]
    renderPage()
    await screen.findByText('Teclado Mecânico')

    expect(screen.getByText('Livros')).toBeInTheDocument()
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

describe('ProductsManagementPage — estado vazio', () => {
  it('mostra mensagem em português quando não há produtos, não "No data"', async () => {
    products = []
    renderPage()
    expect(await screen.findByText(/nenhum produto encontrado/i)).toBeInTheDocument()
    expect(screen.queryByText('No data')).not.toBeInTheDocument()
  })
})

describe('ProductsManagementPage — ordenação', () => {
  const productA = { ...mockProduct, id: 'prod-a', name: 'Abajur', price: 50, stockQuantity: 3, viewCount: 10, soldQuantityLast30Days: 1 }
  const productB = { ...mockProduct, id: 'prod-b', name: 'Bicicleta', price: 900, stockQuantity: 1, viewCount: 30, soldQuantityLast30Days: 5 }

  it('clicar no cabeçalho "Nome" ordena as linhas (asc, depois desc)', async () => {
    products = [productB, productA]
    renderPage()
    await screen.findByRole('cell', { name: 'Bicicleta' })

    const header = screen.getByRole('columnheader', { name: 'Nome' })
    await userEvent.click(header.querySelector('button')!)

    let rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Abajur')
    expect(rows[1]).toContain('Bicicleta')

    await userEvent.click(header.querySelector('button')!)

    rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Bicicleta')
    expect(rows[1]).toContain('Abajur')
  })

  it.each([
    ['Preço', 'price'],
    ['Estoque', 'stockQuantity'],
    ['Visualizações', 'viewCount'],
    ['Vendidos (30d)', 'soldQuantityLast30Days'],
  ])('cabeçalho "%s" é ordenável', async (headerName) => {
    products = [productB, productA]
    renderPage()
    await screen.findByRole('cell', { name: 'Bicicleta' })

    const header = screen.getByRole('columnheader', { name: headerName })
    expect(header.querySelector('button')).toBeInTheDocument()
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
  it('coluna "Ações" só tem o botão "Editar" — Tornar Indisponível/Disponível e Excluir saíram pra edição', async () => {
    renderPage()
    await screen.findByText('Teclado Mecânico')

    expect(screen.getByRole('button', { name: /editar teclado mecânico/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tornar indisponível/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tornar disponível/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /excluir teclado mecânico/i })).not.toBeInTheDocument()
  })
})

describe('ProductsManagementPage — filtros', () => {
  it('filtro de categoria: marcar opção não filtra sozinho, só "Aplicar" chama a API com o categoryId esperado', async () => {
    categories = [mockCategory, mockCategory2]
    products = [mockProduct, mockBookProduct]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')
    expect(screen.getByText('Livro de Receitas')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^categoria/i }))
    await user.click(screen.getByRole('checkbox', { name: mockCategory2.name }))
    expect(screen.getByText('Teclado Mecânico')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await waitFor(() => {
      expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Livro de Receitas')).toBeInTheDocument()
  })

  it('filtro de categoria com 2 valores marcados chama a API com os dois categoryId', async () => {
    categories = [mockCategory, mockCategory2]
    products = [mockProduct, mockBookProduct]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /^categoria/i }))
    await user.click(screen.getByRole('checkbox', { name: mockCategory.name }))
    await user.click(screen.getByRole('checkbox', { name: mockCategory2.name }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await waitFor(() => {
      expect(screen.getByText('Teclado Mecânico')).toBeInTheDocument()
    })
    expect(screen.getByText('Livro de Receitas')).toBeInTheDocument()
  })

  it('filtro de disponibilidade muda a lista exibida e chama a API com o status esperado', async () => {
    products = [mockProduct, mockUnavailableProduct]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')
    expect(screen.getByText('Mouse Óptico')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /disponibilidade/i }))
    await user.click(screen.getByRole('checkbox', { name: 'Indisponível' }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await waitFor(() => {
      expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Mouse Óptico')).toBeInTheDocument()
  })

  it('limpar o filtro de categoria e aplicar volta a listar tudo', async () => {
    categories = [mockCategory, mockCategory2]
    products = [mockProduct, mockBookProduct]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /^categoria/i }))
    await user.click(screen.getByRole('checkbox', { name: mockCategory2.name }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))
    await waitFor(() => {
      expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^categoria/i }))
    await user.click(screen.getByRole('button', { name: /limpar/i }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await waitFor(() => {
      expect(screen.getByText('Teclado Mecânico')).toBeInTheDocument()
    })
    expect(screen.getByText('Livro de Receitas')).toBeInTheDocument()
  })

  it('mantém o foco no campo de busca ao digitar, sem recarregar a página a cada letra', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    const searchInput = screen.getByRole('textbox', { name: /buscar produtos/i })
    await user.click(searchInput)
    await user.type(searchInput, 'tec')

    expect(document.activeElement).toBe(searchInput)
    expect(searchInput).toHaveValue('tec')
    expect(screen.queryByText(/carregando produtos/i)).not.toBeInTheDocument()
  })
})

describe('ProductsManagementPage — promoções', () => {
  const activePromo = {
    id: 'promo-1', name: 'Black Friday', type: 'PERCENT', value: 20,
    startDate: '2026-09-20T00:00:00', endDate: '2026-12-30T23:59:00', status: 'ACTIVE', productCount: 4,
  }
  const expiredPromo = { ...activePromo, id: 'promo-old', name: 'Antiga', status: 'EXPIRED' }

  async function selectBothAndOpen(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('checkbox', { name: /selecionar teclado mecânico/i }))
    await user.click(screen.getByRole('checkbox', { name: /selecionar livro de receitas/i }))
    await user.click(screen.getByRole('button', { name: /aplicar promoção/i }))
    return screen.getByRole('dialog', { name: /aplicar promoção em 2 produtos/i })
  }

  it('coluna "Promoção" mostra o nome da promoção do produto', async () => {
    products = [{ ...mockProduct, promotionId: 'promo-1', promotionName: 'Black Friday' }, mockBookProduct]
    renderPage()

    const row = (await screen.findByText('Teclado Mecânico')).closest('tr') as HTMLElement
    expect(within(row).getByText('Black Friday')).toBeInTheDocument()
  })

  it('sem seleção, não mostra "Aplicar promoção"', async () => {
    renderPage()
    await screen.findByText('Teclado Mecânico')
    expect(screen.queryByRole('button', { name: /aplicar promoção/i })).not.toBeInTheDocument()
  })

  it('"Nova promoção" cria a promoção já com os produtos selecionados', async () => {
    products = [mockProduct, mockBookProduct]
    let body: unknown = null
    server.use(
      http.post('/api/admin/promotions', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...activePromo, name: 'Teste', productCount: 2 }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    const dialog = await selectBothAndOpen(user)
    expect(within(dialog).getByRole('radio', { name: /nova promoção/i })).toBeChecked()
    await user.type(within(dialog).getByLabelText(/^nome/i), 'Teste')
    await user.type(within(dialog).getByLabelText(/^início/i), '2026-10-01T00:00')
    await user.type(within(dialog).getByLabelText(/^fim/i), '2026-10-08T23:59')
    await user.click(within(dialog).getByRole('button', { name: /criar promoção/i }))

    await waitFor(() => expect(body).toEqual({
      name: 'Teste', type: 'PERCENT', value: 10,
      startDate: '2026-10-01T00:00', endDate: '2026-10-08T23:59',
      productIds: ['prod-1', 'prod-2'],
    }))
    expect(await screen.findByText(/promoção teste criada com 2 produtos/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('"Promoção existente" lista só as ativas e agendadas e adiciona os selecionados', async () => {
    products = [mockProduct, mockBookProduct]
    let addBody: unknown = null
    let addedTo = ''
    server.use(
      http.get('/api/admin/promotions', () => HttpResponse.json({ content: [activePromo, expiredPromo], totalPages: 1 })),
      http.post('/api/admin/promotions/:id/products', async ({ request, params }) => {
        addedTo = params.id as string
        addBody = await request.json()
        return HttpResponse.json({ ...activePromo, productCount: 6 })
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    const dialog = await selectBothAndOpen(user)
    await user.click(within(dialog).getByRole('radio', { name: /promoção existente/i }))
    const select = await within(dialog).findByRole('combobox', { name: /^promoção/i })
    expect(within(select).queryByRole('option', { name: /antiga/i })).not.toBeInTheDocument()
    await user.selectOptions(select, 'promo-1')
    await user.click(within(dialog).getByRole('button', { name: /adicionar à promoção/i }))

    await waitFor(() => expect(addedTo).toBe('promo-1'))
    expect(addBody).toEqual({ productIds: ['prod-1', 'prod-2'] })
    expect(await screen.findByText(/2 produtos adicionados à promoção black friday/i)).toBeInTheDocument()
  })

  it('409 (produto em outra promoção): mostra a mensagem e mantém o diálogo aberto', async () => {
    products = [mockProduct, mockBookProduct]
    server.use(
      http.post('/api/admin/promotions', () =>
        HttpResponse.json({ message: 'Estes produtos já estão em outra promoção. Tire-os de lá antes: Teclado Mecânico (em "Natal")' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    const dialog = await selectBothAndOpen(user)
    await user.type(within(dialog).getByLabelText(/^nome/i), 'Teste')
    await user.type(within(dialog).getByLabelText(/^início/i), '2026-10-01T00:00')
    await user.type(within(dialog).getByLabelText(/^fim/i), '2026-10-08T23:59')
    await user.click(within(dialog).getByRole('button', { name: /criar promoção/i }))

    expect(await screen.findByText(/já estão em outra promoção/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('filtro "Promoção" repassa as situações escolhidas', async () => {
    let requested: string[] = []
    server.use(
      http.get('/api/admin/products', ({ request }) => {
        requested = new URL(request.url).searchParams.getAll('promotion')
        return HttpResponse.json(makePage(products))
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /^promoção/i }))
    await user.click(screen.getByRole('checkbox', { name: 'Ativa' }))
    await user.click(screen.getByRole('checkbox', { name: 'Agendada' }))
    await user.click(screen.getByRole('button', { name: /^aplicar$/i }))

    await waitFor(() => expect(requested).toEqual(['ACTIVE', 'SCHEDULED']))
  })
})

describe('ProductsManagementPage — categorias', () => {
  it('não exibe mais o botão "Nova categoria" (o cadastro fica na tela de Categorias)', async () => {
    renderPage()
    await screen.findByText('Teclado Mecânico')
    expect(screen.queryByRole('button', { name: /nova categoria/i })).not.toBeInTheDocument()
  })
})

describe('ProductsManagementPage — controle de acesso', () => {
  it('redireciona para /dashboard quando usuário não tem permissão de produtos', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_CUSTOMERS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
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
