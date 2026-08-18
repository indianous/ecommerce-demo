import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import CatalogPage from '../catalog/page'
import type { Product, ProductPage } from '@/types'

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
    render(jsx)

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
    render(jsx)

    expect(screen.getByRole('link', { name: 'Electronics' })).toHaveAttribute(
      'href',
      '/catalog?category=electronics',
    )
  })

  it('renderiza o campo de busca (CatalogSearch)', async () => {
    const jsx = await CatalogPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.getByRole('textbox', { name: /search input/i })).toBeInTheDocument()
  })

  it('renderiza o seletor de ordenação (CatalogSort) com "Nome (A-Z)" selecionado por padrão', async () => {
    const jsx = await CatalogPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.getByRole('combobox', { name: /ordenar por/i })).toHaveValue('NAME_ASC')
  })

  it('CatalogSort reflete o sort vindo de searchParams', async () => {
    const jsx = await CatalogPage({ searchParams: Promise.resolve({ sort: 'PRICE_DESC' }) })
    render(jsx)

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
    render(jsx)

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
    render(jsx)

    expect(screen.getByText('Nenhum produto encontrado.')).toBeInTheDocument()
  })
})
