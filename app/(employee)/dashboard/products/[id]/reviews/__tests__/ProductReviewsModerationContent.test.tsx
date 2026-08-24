import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'

const replaceMock = vi.fn()
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}))

import { ProductReviewsModerationContent } from '../ProductReviewsModerationContent'
import { useAuthStore } from '@/stores/auth.store'
import type { ProductReview, ProductReviewPage } from '@/types'

const productId = 'prod-1'

function makeReview(overrides: Partial<ProductReview> = {}): ProductReview {
  return {
    id: 'review-1',
    productId,
    userId: 'user-1',
    userName: 'Maria',
    rating: 1,
    comment: 'Conteúdo impróprio',
    imageUrls: [],
    createdAt: '2026-06-29T00:00:00',
    updatedAt: '2026-06-29T00:00:00',
    ...overrides,
  }
}

function makePage(reviews: ProductReview[]): ProductReviewPage {
  return {
    content: reviews,
    page: 0,
    size: 50,
    totalElements: reviews.length,
    totalPages: 1,
    last: true,
    averageRating: reviews.length ? 1 : null,
    totalReviews: reviews.length,
  }
}

let deleteHeaders: Headers | null = null

const server = setupServer(
  http.get(`/api/products/${productId}/reviews`, () => HttpResponse.json(makePage([makeReview()]))),
  http.delete(`/api/admin/products/${productId}/reviews/review-1`, ({ request }) => {
    deleteHeaders = request.headers
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  pushMock.mockClear()
  deleteHeaders = null
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

function renderModeration(basePath?: string) {
  return render(
    <ToastProvider>
      <ProductReviewsModerationContent id={productId} basePath={basePath} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('ProductReviewsModerationContent', () => {
  it('lista as avaliações do produto (GET público, sem token)', async () => {
    await act(async () => {
      useAuthStore.setState({
        accessToken: 'mock-token',
        isAuthenticated: true,
        user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'] },
      })
    })
    renderModeration()

    expect(await screen.findByText('Maria')).toBeInTheDocument()
    expect(screen.getByText('Conteúdo impróprio')).toBeInTheDocument()
  })

  it('remove a avaliação após confirmar no Dialog e mostra toast de sucesso', async () => {
    await act(async () => {
      useAuthStore.setState({
        accessToken: 'mock-token',
        isAuthenticated: true,
        user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'] },
      })
    })
    const user = userEvent.setup()
    renderModeration()

    await screen.findByText('Maria')
    await user.click(screen.getByRole('button', { name: /remover avaliação de maria/i }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^confirmar$/i }))

    await waitFor(() => expect(deleteHeaders?.get('Authorization')).toBe('Bearer mock-token'))
    await waitFor(() => expect(screen.queryByText('Maria')).not.toBeInTheDocument())
  })

  it('bloqueia quem não tem MANAGE_PRODUCTS nem ADMIN', async () => {
    await act(async () => {
      useAuthStore.setState({
        accessToken: 'mock-token',
        isAuthenticated: true,
        user: { id: 'u-2', name: 'Sem Permissão', email: 'no@test.com', role: 'EMPLOYEE', permissions: [] },
      })
    })
    renderModeration()

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/dashboard'))
  })
})
