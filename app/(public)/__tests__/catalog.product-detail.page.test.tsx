import { render, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import type { ReactElement } from 'react'
import ProductDetailPage from '../catalog/[slug]/page'
import { redirect } from 'next/navigation'
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
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

const mockProduct: Product = {
  id: 'prod-1',
  categories: [{ id: 'cat-1', name: 'Electronics', slug: 'electronics' }],
  name: 'Mechanical Keyboard',
  slug: 'mechanical-keyboard',
  description: 'Um teclado mecânico excelente',
  price: 499.9,
  stockQuantity: 10,
  imageUrls: [],
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
  http.get('http://localhost:8080/api/v1/catalog/products/slug/mechanical-keyboard', () =>
    HttpResponse.json(mockProduct),
  ),
  http.get('http://localhost:8080/api/v1/products/prod-1/reviews', () =>
    HttpResponse.json(makeReviewPage([makeReview()])),
  ),
  http.get('http://localhost:8080/api/v1/catalog/products/slug/missing', () =>
    HttpResponse.json({ status: 404, message: 'Product not found' }, { status: 404 }),
  ),
  http.get('http://localhost:8080/api/v1/catalog/products/missing', () =>
    HttpResponse.json({ status: 404, message: 'Product not found' }, { status: 404 }),
  ),
  // fallback por UUID: rota antiga /catalog/prod-1 continua resolvendo o mesmo produto
  http.get('http://localhost:8080/api/v1/catalog/products/slug/prod-1', () =>
    HttpResponse.json({ status: 404, message: 'Product not found' }, { status: 404 }),
  ),
  http.get('http://localhost:8080/api/v1/catalog/products/prod-1', () => HttpResponse.json(mockProduct)),
  http.get('http://localhost:8080/api/v1/catalog/products/prod-1/related', () => HttpResponse.json([])),
  http.post('/api/products/prod-1/views', () => new HttpResponse(null, { status: 204 })),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  vi.mocked(redirect).mockClear()
})
afterAll(() => server.close())

describe('ProductDetailPage', () => {
  it('renderiza nome, descrição, preço, categoria e nota média do produto', async () => {
    const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: 'mechanical-keyboard' }) })
    renderWithToast(jsx)

    expect(screen.getByRole('heading', { name: 'Mechanical Keyboard' })).toBeInTheDocument()
    expect(screen.getByText('Um teclado mecânico excelente')).toBeInTheDocument()
    expect(screen.getByText(/499,90/)).toBeInTheDocument()
    expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('radiogroup', { name: /rating/i }).length).toBeGreaterThan(0)
  })

  it('renderiza breadcrumb Catálogo > Categoria > Nome do produto', async () => {
    const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: 'mechanical-keyboard' }) })
    renderWithToast(jsx)

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(within(breadcrumb).getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalog')
    expect(within(breadcrumb).getByRole('link', { name: 'Electronics' })).toHaveAttribute(
      'href',
      '/catalog?category=electronics',
    )
    expect(within(breadcrumb).getByText('Mechanical Keyboard')).toHaveAttribute('aria-current', 'page')
  })

  it('produto com múltiplas categorias mostra todas como badges', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products/slug/mechanical-keyboard', () =>
        HttpResponse.json({
          ...mockProduct,
          categories: [
            { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
            { id: 'cat-2', name: 'Promoções', slug: 'promocoes' },
          ],
        }),
      ),
    )
    const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: 'mechanical-keyboard' }) })
    renderWithToast(jsx)

    expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0)
    expect(screen.getByText('Promoções')).toBeInTheDocument()
  })

  it('mostra "Seja o primeiro a avaliar" quando o produto não tem avaliações', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products/slug/mechanical-keyboard', () =>
        HttpResponse.json({ ...mockProduct, averageRating: null, reviewCount: 0 }),
      ),
      http.get('http://localhost:8080/api/v1/products/prod-1/reviews', () => HttpResponse.json(makeReviewPage([]))),
    )
    const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: 'mechanical-keyboard' }) })
    renderWithToast(jsx)

    expect(screen.getByText(/seja o primeiro a avaliar/i)).toBeInTheDocument()
  })

  it('lista os comentários e fotos das avaliações existentes', async () => {
    const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: 'mechanical-keyboard' }) })
    renderWithToast(jsx)

    expect(await screen.findByText('Excelente produto!')).toBeInTheDocument()
    expect(screen.getByAltText(/foto enviada por maria/i)).toHaveAttribute(
      'src',
      'https://cdn.example.com/foto.jpg',
    )
  })

  it('slug inexistente e UUID inexistente aciona notFound()', async () => {
    await expect(ProductDetailPage({ params: Promise.resolve({ slug: 'missing' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
  })

  it('produto inativo renderiza normalmente, sem botão de compra', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products/slug/mechanical-keyboard', () =>
        HttpResponse.json({ ...mockProduct, active: false, status: 'UNAVAILABLE' }),
      ),
    )
    const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: 'mechanical-keyboard' }) })
    renderWithToast(jsx)

    expect(screen.getByRole('heading', { name: 'Mechanical Keyboard' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /adicionar ao carrinho/i })).not.toBeInTheDocument()
  })

  it('acessar a rota com um UUID válido redireciona para /catalog/{slug} do mesmo produto', async () => {
    await expect(ProductDetailPage({ params: Promise.resolve({ slug: 'prod-1' }) })).rejects.toThrow(
      'NEXT_REDIRECT:/catalog/mechanical-keyboard',
    )
    expect(redirect).toHaveBeenCalledWith('/catalog/mechanical-keyboard')
  })

  it('produto em promoção mostra preço "de/por" e badge "Promoção"', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products/slug/mechanical-keyboard', () =>
        HttpResponse.json({ ...mockProduct, effectivePrice: 399.9, onPromotion: true }),
      ),
    )
    const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: 'mechanical-keyboard' }) })
    renderWithToast(jsx)

    expect(screen.getByText(/promoção/i)).toBeInTheDocument()
    expect(screen.getByText(/499,90/)).toBeInTheDocument()
    expect(screen.getByText(/399,90/)).toBeInTheDocument()
  })

  it('renderiza "Produtos relacionados" com os itens retornados pelo backend', async () => {
    const related: Product = { ...mockProduct, id: 'prod-2', name: 'Mouse Sem Fio', slug: 'mouse-sem-fio' }
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products/prod-1/related', () => HttpResponse.json([related])),
    )
    const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: 'mechanical-keyboard' }) })
    renderWithToast(jsx)

    expect(screen.getByRole('heading', { name: /produtos relacionados/i })).toBeInTheDocument()
    expect(screen.getByText('Mouse Sem Fio')).toBeInTheDocument()
  })

  it('lista vazia de relacionados: a seção não aparece', async () => {
    const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: 'mechanical-keyboard' }) })
    renderWithToast(jsx)

    expect(screen.queryByRole('heading', { name: /produtos relacionados/i })).not.toBeInTheDocument()
  })

  it('produto com 2+ imagens renderiza o Carousel com uma slide por imagem', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products/slug/mechanical-keyboard', () =>
        HttpResponse.json({
          ...mockProduct,
          imageUrls: ['https://cdn.example.com/1.jpg', 'https://cdn.example.com/2.jpg'],
        }),
      ),
    )
    const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: 'mechanical-keyboard' }) })
    renderWithToast(jsx)

    const carousel = screen.getByRole('region', { name: /carousel/i })
    expect(within(carousel).getAllByRole('group', { name: /slide/i })).toHaveLength(2)
  })

  it('produto com 1 imagem: galeria ainda funciona', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products/slug/mechanical-keyboard', () =>
        HttpResponse.json({ ...mockProduct, imageUrls: ['https://cdn.example.com/1.jpg'] }),
      ),
    )
    const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: 'mechanical-keyboard' }) })
    renderWithToast(jsx)

    const carousel = screen.getByRole('region', { name: /carousel/i })
    expect(within(carousel).getAllByRole('group', { name: /slide/i })).toHaveLength(1)
  })

  it('produto sem nenhuma imagem cai no placeholder, sem renderizar Carousel', async () => {
    const jsx = await ProductDetailPage({ params: Promise.resolve({ slug: 'mechanical-keyboard' }) })
    renderWithToast(jsx)

    expect(screen.queryByRole('region', { name: /carousel/i })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Mechanical Keyboard' })).toBeInTheDocument()
  })
})
