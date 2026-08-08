import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { ProductReviewsSection } from '../ProductReviewsSection'
import { useAuthStore } from '@/stores/auth.store'
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

function emptyPage(): ProductReviewPage {
  return {
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    last: true,
    averageRating: null,
    totalReviews: 0,
  }
}

function renderSection(reviews: ProductReviewPage = emptyPage()) {
  return render(
    <ToastProvider>
      <ProductReviewsSection productId={productId} reviews={reviews} />
      <ToastViewport />
    </ToastProvider>,
  )
}

const server = setupServer(
  http.get(`/api/products/${productId}/reviews`, () => HttpResponse.json(emptyPage())),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

describe('ProductReviewsSection', () => {
  it('cliente não logado vê CTA "Entrar para avaliar" em vez do formulário', () => {
    renderSection()

    expect(screen.getByRole('link', { name: /entrar para avaliar/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enviar avaliação/i })).not.toBeInTheDocument()
  })

  it('cliente logado inelegível vê mensagem explicando o motivo, sem formulário', async () => {
    server.use(
      http.get(`/api/products/${productId}/reviews/me`, () =>
        HttpResponse.json({ eligible: false, alreadyReviewed: false, review: null }),
      ),
    )
    await act(async () => {
      useAuthStore.setState({ accessToken: 'token', isAuthenticated: true })
    })
    renderSection()

    expect(await screen.findByText(/você precisa ter recebido este produto/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enviar avaliação/i })).not.toBeInTheDocument()
  })

  it('cliente elegível vê o formulário e consegue enviar uma avaliação com foto', async () => {
    let uploadCalls = 0
    let createBody: unknown = null

    server.use(
      http.get(`/api/products/${productId}/reviews/me`, () =>
        HttpResponse.json({ eligible: true, alreadyReviewed: false, review: null }),
      ),
      http.post('/api/upload/image', () => {
        uploadCalls += 1
        return HttpResponse.json({ url: `https://cdn.example.com/${uploadCalls}.jpg` })
      }),
      http.post(`/api/products/${productId}/reviews`, async ({ request }) => {
        createBody = await request.json()
        return HttpResponse.json(makeReview({ rating: 5, comment: 'Ótimo!' }), { status: 201 })
      }),
    )
    await act(async () => {
      useAuthStore.setState({ accessToken: 'token', isAuthenticated: true })
    })
    const user = userEvent.setup()
    renderSection()

    await screen.findByRole('button', { name: /enviar avaliação/i })

    await user.click(screen.getByRole('radio', { name: /5 star/i }))
    await user.type(screen.getByLabelText(/comentário/i), 'Ótimo!')

    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText(/file upload/i), file)

    await user.click(screen.getByRole('button', { name: /enviar avaliação/i }))

    await waitFor(() => expect(uploadCalls).toBe(1))
    expect(createBody).toMatchObject({
      rating: 5,
      comment: 'Ótimo!',
      imageUrls: ['https://cdn.example.com/1.jpg'],
    })
  })

  it('cliente que já avaliou vê o formulário pré-preenchido e pode excluir a avaliação', async () => {
    const existing = makeReview({ rating: 3, comment: 'Razoável' })
    let deleteCalled = false

    server.use(
      http.get(`/api/products/${productId}/reviews/me`, () =>
        HttpResponse.json({ eligible: true, alreadyReviewed: true, review: existing }),
      ),
      http.delete(`/api/products/${productId}/reviews/${existing.id}`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await act(async () => {
      useAuthStore.setState({ accessToken: 'token', isAuthenticated: true })
    })
    const user = userEvent.setup()
    renderSection()

    const saveButton = await screen.findByRole('button', { name: /salvar/i })
    expect(saveButton).toBeEnabled()
    expect(screen.getByLabelText(/comentário/i)).toHaveValue('Razoável')

    await user.click(screen.getByRole('button', { name: /excluir avaliação/i }))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })

  it('mostra toast de erro com a mensagem retornada pelo backend ao falhar', async () => {
    server.use(
      http.get(`/api/products/${productId}/reviews/me`, () =>
        HttpResponse.json({ eligible: true, alreadyReviewed: false, review: null }),
      ),
      http.post(`/api/products/${productId}/reviews`, () =>
        HttpResponse.json({ message: 'Você já avaliou este produto.' }, { status: 409 }),
      ),
    )
    await act(async () => {
      useAuthStore.setState({ accessToken: 'token', isAuthenticated: true })
    })
    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('radio', { name: /3 star/i }))
    await user.click(screen.getByRole('button', { name: /enviar avaliação/i }))

    expect((await screen.findAllByText(/você já avaliou este produto/i)).length).toBeGreaterThan(0)
  })
})
