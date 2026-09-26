import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import CatalogPage from '../catalog/page'
import type { Product, ProductPage } from '@/types'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      {ui}
      <ToastViewport />
    </ToastProvider>,
  )
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const mockProduct: Product = {
  id: 'prod-1',
  categories: [{ id: 'cat-1', name: 'Electronics', slug: 'electronics' }],
  name: 'Mechanical Keyboard',
  slug: 'mechanical-keyboard',
  price: 499.9,
  stockQuantity: 10,
  imageUrls: [],
  active: true,
  status: 'AVAILABLE',
  freeShipping: false,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
}

const mockPage: ProductPage = {
  content: [mockProduct],
  page: 0,
  size: 20,
  totalElements: 21,
  totalPages: 2,
  last: false,
}

const server = setupServer(
  http.get('http://localhost:8080/api/v1/catalog/products', () => HttpResponse.json(mockPage)),
  http.get('http://localhost:8080/api/v1/catalog/categories', () => HttpResponse.json([])),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('CatalogPage', () => {
  it('renders products and pagination when there is more than one page', async () => {
    const jsx = await CatalogPage({ searchParams: Promise.resolve({}) })
    renderWithProviders(jsx)

    expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
  })

  it('requests the requested page (0-indexed) from the backend', async () => {
    let requestedPage: string | null = null
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products', ({ request }) => {
        requestedPage = new URL(request.url).searchParams.get('page')
        return HttpResponse.json(mockPage)
      }),
    )

    await CatalogPage({ searchParams: Promise.resolve({ page: '2' }) })

    expect(requestedPage).toBe('1')
  })

  it('envia o filtro de categoria pelo slug (category=), não pelo id', async () => {
    let requestedCategory: string | null = null
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products', ({ request }) => {
        requestedCategory = new URL(request.url).searchParams.get('category')
        return HttpResponse.json(mockPage)
      }),
    )

    await CatalogPage({ searchParams: Promise.resolve({ category: 'electronics' }) })

    expect(requestedCategory).toBe('electronics')
  })

  it('links de filtro por categoria usam o slug, não o id', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/categories', () =>
        HttpResponse.json([{ id: 'cat-1', name: 'Electronics', slug: 'electronics' }]),
      ),
    )

    const jsx = await CatalogPage({ searchParams: Promise.resolve({}) })
    renderWithProviders(jsx)

    expect(screen.getByRole('link', { name: 'Electronics' })).toHaveAttribute(
      'href',
      '/catalog?category=electronics',
    )
  })

  it('renderiza o campo de busca (CatalogSearch)', async () => {
    const jsx = await CatalogPage({ searchParams: Promise.resolve({}) })
    renderWithProviders(jsx)

    expect(screen.getByRole('textbox', { name: /search input/i })).toBeInTheDocument()
  })

  it('renderiza o seletor de ordenação (CatalogSort) com "Nome (A-Z)" selecionado por padrão', async () => {
    const jsx = await CatalogPage({ searchParams: Promise.resolve({}) })
    renderWithProviders(jsx)

    expect(screen.getByRole('combobox', { name: /ordenar por/i })).toHaveValue('NAME_ASC')
  })

  it('CatalogSort reflete o sort vindo de searchParams', async () => {
    const jsx = await CatalogPage({ searchParams: Promise.resolve({ sort: 'PRICE_DESC' }) })
    renderWithProviders(jsx)

    expect(screen.getByRole('combobox', { name: /ordenar por/i })).toHaveValue('PRICE_DESC')
  })

  it('envia sort na querystring pro backend quando presente em searchParams', async () => {
    let requestedSort: string | null = null
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products', ({ request }) => {
        requestedSort = new URL(request.url).searchParams.get('sort')
        return HttpResponse.json(mockPage)
      }),
    )

    await CatalogPage({ searchParams: Promise.resolve({ sort: 'PRICE_ASC' }) })

    expect(requestedSort).toBe('PRICE_ASC')
  })

  it('links de categoria preservam search e sort atuais', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/categories', () =>
        HttpResponse.json([{ id: 'cat-1', name: 'Electronics', slug: 'electronics' }]),
      ),
    )

    const jsx = await CatalogPage({
      searchParams: Promise.resolve({ search: 'teclado', sort: 'NEWEST' }),
    })
    renderWithProviders(jsx)

    expect(screen.getByRole('link', { name: 'Electronics' })).toHaveAttribute(
      'href',
      '/catalog?category=electronics&search=teclado&sort=NEWEST',
    )
  })

  it('mostra "Nenhum produto encontrado." quando a busca não retorna produtos', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products', () =>
        HttpResponse.json({ ...mockPage, content: [], totalElements: 0 }),
      ),
    )

    const jsx = await CatalogPage({ searchParams: Promise.resolve({}) })
    renderWithProviders(jsx)

    expect(screen.getByText('Nenhum produto encontrado.')).toBeInTheDocument()
  })

  it('envia onSale=true ao backend quando presente em searchParams e marca o filtro "Em promoção"', async () => {
    let requestedOnSale: string | null = null
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products', ({ request }) => {
        requestedOnSale = new URL(request.url).searchParams.get('onSale')
        return HttpResponse.json(mockPage)
      }),
    )

    const jsx = await CatalogPage({ searchParams: Promise.resolve({ onSale: 'true' }) })
    renderWithProviders(jsx)

    expect(requestedOnSale).toBe('true')
    expect(screen.getByRole('switch', { name: /em promoção/i })).toBeChecked()
  })

  it('sem onSale na URL, não envia o filtro e o "Em promoção" fica desligado', async () => {
    let requestedOnSale: string | null = 'x'
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products', ({ request }) => {
        requestedOnSale = new URL(request.url).searchParams.get('onSale')
        return HttpResponse.json(mockPage)
      }),
    )

    const jsx = await CatalogPage({ searchParams: Promise.resolve({}) })
    renderWithProviders(jsx)

    expect(requestedOnSale).toBeNull()
    expect(screen.getByRole('switch', { name: /em promoção/i })).not.toBeChecked()
  })

  it('links de categoria preservam o filtro "Em promoção"', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/categories', () =>
        HttpResponse.json([{ id: 'cat-1', name: 'Electronics', slug: 'electronics' }]),
      ),
    )

    const jsx = await CatalogPage({ searchParams: Promise.resolve({ onSale: 'true' }) })
    renderWithProviders(jsx)

    expect(screen.getByRole('link', { name: 'Electronics' })).toHaveAttribute('href', '/catalog?category=electronics&onSale=true')
  })

  describe('layout do topo (plano 66, etapa 8)', () => {
    const categories = [
      { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
      { id: 'cat-2', name: 'Casa', slug: 'casa' },
    ]

    function withCategories() {
      server.use(http.get('http://localhost:8080/api/v1/catalog/categories', () => HttpResponse.json(categories)))
    }

    function withTotal(totalElements: number) {
      server.use(
        http.get('http://localhost:8080/api/v1/catalog/products', () =>
          HttpResponse.json({ ...mockPage, totalElements, totalPages: 1, last: true }),
        ),
      )
    }

    it('título é o heading de nível 1 "Catálogo"', async () => {
      renderWithProviders(await CatalogPage({ searchParams: Promise.resolve({}) }))

      expect(screen.getByRole('heading', { level: 1, name: 'Catálogo' })).toBeInTheDocument()
    })

    it('linha de apoio com a quantidade de produtos', async () => {
      withTotal(12)
      renderWithProviders(await CatalogPage({ searchParams: Promise.resolve({}) }))

      expect(screen.getByText('12 produtos')).toBeInTheDocument()
    })

    it('com busca, a linha de apoio mostra o termo; com 1 resultado, fica no singular', async () => {
      withTotal(1)
      renderWithProviders(await CatalogPage({ searchParams: Promise.resolve({ search: 'camisa' }) }))

      expect(screen.getByText('1 produto · resultados para "camisa"')).toBeInTheDocument()
    })

    it('a categoria atual tem aria-current="page"; as outras e "Todos" não', async () => {
      withCategories()
      renderWithProviders(await CatalogPage({ searchParams: Promise.resolve({ category: 'casa' }) }))

      expect(screen.getByRole('link', { name: 'Casa' })).toHaveAttribute('aria-current', 'page')
      expect(screen.getByRole('link', { name: 'Electronics' })).not.toHaveAttribute('aria-current')
      expect(screen.getByRole('link', { name: 'Todos' })).not.toHaveAttribute('aria-current')
    })

    it('sem categoria na URL, "Todos" é o atual', async () => {
      withCategories()
      renderWithProviders(await CatalogPage({ searchParams: Promise.resolve({}) }))

      expect(screen.getByRole('link', { name: 'Todos' })).toHaveAttribute('aria-current', 'page')
    })

    it('"Todos" tira só a categoria: mantém busca, ordenação e "Em promoção"', async () => {
      withCategories()
      renderWithProviders(
        await CatalogPage({ searchParams: Promise.resolve({ category: 'casa', search: 'mesa', sort: 'NEWEST', onSale: 'true' }) }),
      )

      expect(screen.getByRole('link', { name: 'Todos' })).toHaveAttribute('href', '/catalog?search=mesa&sort=NEWEST&onSale=true')
    })
  })
})
