import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ProductReviewsSection } from '../ProductReviewsSection'
import type { ProductReview, ProductReviewPage } from '@/types'

const productId = 'prod-1'

function makeReview(overrides: Partial<ProductReview> = {}): ProductReview {
  return {
    id: 'review-1',
    productId,
    userId: 'user-1',
    userName: 'Maria',
    rating: 4,
    comment: 'Muito bom',
    imageUrls: [],
    createdAt: '2026-06-29T00:00:00',
    updatedAt: '2026-06-29T00:00:00',
    ...overrides,
  }
}

function page(overrides: Partial<ProductReviewPage> = {}): ProductReviewPage {
  return {
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    last: true,
    averageRating: null,
    totalReviews: 0,
    ...overrides,
  }
}

const server = setupServer(
  http.get(`/api/products/${productId}/reviews`, () => HttpResponse.json(page())),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('ProductReviewsSection', () => {
  it('mostra "Ainda não há avaliações..." quando a lista está vazia', () => {
    render(<ProductReviewsSection productId={productId} reviews={page()} />)

    expect(screen.getByText(/ainda não há avaliações/i)).toBeInTheDocument()
  })

  it('renderiza as avaliações existentes via ProductReviewCard', () => {
    const review = makeReview()
    render(
      <ProductReviewsSection
        productId={productId}
        reviews={page({ content: [review], totalElements: 1 })}
      />,
    )

    expect(screen.getByText('Maria')).toBeInTheDocument()
    expect(screen.getByText('Muito bom')).toBeInTheDocument()
  })

  it('não renderiza formulário nem botões de avaliar/editar/excluir', () => {
    const review = makeReview()
    render(
      <ProductReviewsSection
        productId={productId}
        reviews={page({ content: [review], totalElements: 1 })}
      />,
    )

    expect(screen.queryByRole('button', { name: /avaliar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/sua nota/i)).not.toBeInTheDocument()
  })

  it('pagina corretamente ao trocar de página', async () => {
    server.use(
      http.get(`/api/products/${productId}/reviews`, ({ request }) => {
        const url = new URL(request.url)
        const requestedPage = url.searchParams.get('page')
        if (requestedPage === '1') {
          return HttpResponse.json(
            page({ content: [makeReview({ id: 'review-2', userName: 'João' })], page: 1, totalElements: 2 }),
          )
        }
        return HttpResponse.json(page({ content: [makeReview()], page: 0, totalElements: 2, totalPages: 2 }))
      }),
    )
    const user = userEvent.setup()
    render(
      <ProductReviewsSection
        productId={productId}
        reviews={page({ content: [makeReview()], totalElements: 2, totalPages: 2 })}
      />,
    )

    expect(screen.getByText('Maria')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(await screen.findByText('João')).toBeInTheDocument()
  })
})
