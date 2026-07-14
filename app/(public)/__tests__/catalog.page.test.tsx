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
  categoryId: 'cat-1',
  categoryName: 'Electronics',
  name: 'Mechanical Keyboard',
  price: 499.9,
  stockQuantity: 10,
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
  it('renders a search field and pagination when there is more than one page', async () => {
    const jsx = await CatalogPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.getByRole('textbox', { name: /search input/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
    expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument()
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
})
