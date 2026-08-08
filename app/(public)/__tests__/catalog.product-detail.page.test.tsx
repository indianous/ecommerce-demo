import { render, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import type { ReactElement } from 'react'
import ProductDetailPage from '../catalog/[id]/page'
import type { Product, ProductReview, ProductReviewPage } from '@/types'

function renderWithToast(jsx: ReactElement) {
  return render(
    <ToastProvider>
      {jsx}
      <ToastViewport />
    </ToastProvider>,
  )
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const mockProduct: Product = {
  id: 'prod-1',
  categoryId: 'cat-1',
  categoryName: 'Electronics',
  name: 'Mechanical Keyboard',
  description: 'Um teclado mecânico excelente',
  price: 499.9,
  stockQuantity: 10,
  active: true,
  status: 'AVAILABLE',
  createdAt: '2026-06-29T00:00:00',
  updatedAt: '2026-06-29T00:00:00',
  averageRating: 4.5,
  reviewCount: 2,
}

function makeReview(overrides: Partial<ProductReview> = {}): ProductReview {
  return {
    id: 'review-1',
    productId: 'prod-1',
    userId: 'user-1',
    userName: 'Maria',
    rating: 5,
    comment: 'Excelente produto!',
    imageUrls: ['https://cdn.example.com/foto.jpg'],
    createdAt: '2026-06-29T00:00:00',
    updatedAt: '2026-06-29T00:00:00',
    ...overrides,
  }
}

function makeReviewPage(reviews: ProductReview[], overrides: Partial<ProductReviewPage> = {}): ProductReviewPage {
  return {
    content: reviews,
    page: 0,
    size: 20,
    totalElements: reviews.length,
    totalPages: reviews.length > 0 ? 1 : 0,
    last: true,
    averageRating: reviews.length ? 4.5 : null,
    totalReviews: reviews.length,
    ...overrides,
  }
}

const server = setupServer(
  http.get('http://localhost:8080/api/v1/catalog/products/prod-1', () => HttpResponse.json(mockProduct)),
  http.get('http://localhost:8080/api/v1/products/prod-1/reviews', () =>
    HttpResponse.json(makeReviewPage([makeReview()])),
  ),
  http.get('http://localhost:8080/api/v1/catalog/products/missing', () =>
    HttpResponse.json({ status: 404, message: 'Product not found' }, { status: 404 }),
  ),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('ProductDetailPage', () => {
  it('renderiza nome, descrição, preço, categoria e nota média do produto', async () => {
    const jsx = await ProductDetailPage({ params: Promise.resolve({ id: 'prod-1' }) })
    renderWithToast(jsx)

    expect(screen.getByRole('heading', { name: 'Mechanical Keyboard' })).toBeInTheDocument()
    expect(screen.getByText('Um teclado mecânico excelente')).toBeInTheDocument()
    expect(screen.getByText(/499,90/)).toBeInTheDocument()
    expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('radiogroup', { name: /rating/i }).length).toBeGreaterThan(0)
  })

  it('renderiza breadcrumb Catálogo > Categoria > Nome do produto', async () => {
    const jsx = await ProductDetailPage({ params: Promise.resolve({ id: 'prod-1' }) })
    renderWithToast(jsx)

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(within(breadcrumb).getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalog')
    expect(within(breadcrumb).getByRole('link', { name: 'Electronics' })).toHaveAttribute(
      'href',
      '/catalog?categoryId=cat-1',
    )
    expect(within(breadcrumb).getByText('Mechanical Keyboard')).toHaveAttribute('aria-current', 'page')
  })

  it('mostra "Seja o primeiro a avaliar" quando o produto não tem avaliações', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products/prod-1', () =>
        HttpResponse.json({ ...mockProduct, averageRating: null, reviewCount: 0 }),
      ),
      http.get('http://localhost:8080/api/v1/products/prod-1/reviews', () => HttpResponse.json(makeReviewPage([]))),
    )
    const jsx = await ProductDetailPage({ params: Promise.resolve({ id: 'prod-1' }) })
    renderWithToast(jsx)

    expect(screen.getByText(/seja o primeiro a avaliar/i)).toBeInTheDocument()
  })

  it('lista os comentários e fotos das avaliações existentes', async () => {
    const jsx = await ProductDetailPage({ params: Promise.resolve({ id: 'prod-1' }) })
    renderWithToast(jsx)

    expect(await screen.findByText('Excelente produto!')).toBeInTheDocument()
    expect(screen.getByAltText(/foto enviada por maria/i)).toHaveAttribute(
      'src',
      'https://cdn.example.com/foto.jpg',
    )
  })

  it('produto inexistente (404 do backend) aciona notFound()', async () => {
    await expect(ProductDetailPage({ params: Promise.resolve({ id: 'missing' }) })).rejects.toThrow()
  })
})
