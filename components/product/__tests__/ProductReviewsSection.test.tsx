import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()
let mockSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/catalog/prod-1',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

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

describe('ProductReviewsSection', () => {
  it('mostra "Ainda não há avaliações..." quando a lista está vazia', () => {
    render(<ProductReviewsSection reviews={page()} />)

    expect(screen.getByText(/ainda não há avaliações/i)).toBeInTheDocument()
  })

  it('renderiza as avaliações existentes via ProductReviewCard', () => {
    const review = makeReview()
    render(<ProductReviewsSection reviews={page({ content: [review], totalElements: 1 })} />)

    expect(screen.getByText('Maria')).toBeInTheDocument()
    expect(screen.getByText('Muito bom')).toBeInTheDocument()
  })

  it('não renderiza formulário nem botões de avaliar/editar/excluir', () => {
    const review = makeReview()
    render(<ProductReviewsSection reviews={page({ content: [review], totalElements: 1 })} />)

    expect(screen.queryByRole('button', { name: /avaliar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/sua nota/i)).not.toBeInTheDocument()
  })

  it('com totalPages<=1, não exibe navegação de página', () => {
    render(<ProductReviewsSection reviews={page({ content: [makeReview()], totalElements: 1, totalPages: 1 })} />)

    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('clicar em "Next page" escreve ?reviewsPage=2 na URL (server component refaz o fetch)', async () => {
    const user = userEvent.setup()
    render(
      <ProductReviewsSection
        reviews={page({ content: [makeReview()], totalElements: 2, totalPages: 2 })}
      />,
    )

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(pushMock).toHaveBeenCalledWith('/catalog/prod-1?reviewsPage=2')
  })

  it('reviews.page vindo do servidor já reflete a página pedida na URL (?reviewsPage=2 → currentPage=2)', () => {
    mockSearch = 'reviewsPage=2'
    render(
      <ProductReviewsSection
        reviews={page({ content: [makeReview({ id: 'review-2', userName: 'João' })], page: 1, totalElements: 2, totalPages: 2 })}
      />,
    )

    expect(screen.getByText('João')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /page 2/i })).toHaveAttribute('aria-current', 'page')
  })
})
