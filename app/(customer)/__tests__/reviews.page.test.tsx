import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import ReviewsPage from '../reviews/page'
import { useAuthStore } from '@/stores/auth.store'
import type { MyReviewableProduct, ProductReview } from '@/types'

function makeReview(overrides: Partial<ProductReview> = {}): ProductReview {
  return {
    id: 'review-1',
    productId: 'p1',
    userId: 'user-1',
    userName: 'John Doe',
    rating: 3,
    comment: 'Razoável',
    imageUrls: [],
    createdAt: '2026-06-29T00:00:00',
    updatedAt: '2026-06-29T00:00:00',
    ...overrides,
  }
}

function unreviewedItem(): MyReviewableProduct {
  return { productId: 'p1', productName: 'Teclado Mecânico', productImageUrl: undefined, review: null }
}

function reviewedItem(): MyReviewableProduct {
  return { productId: 'p1', productName: 'Teclado Mecânico', productImageUrl: undefined, review: makeReview() }
}

const server = setupServer(http.get('/api/reviews/me', () => HttpResponse.json([])))

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
})

function renderPage() {
  return render(
    <ToastProvider>
      <ReviewsPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('ReviewsPage', () => {
  it('mostra mensagem quando não há produtos disponíveis para avaliação', async () => {
    renderPage()

    expect(await screen.findByText(/nenhum produto/i)).toBeInTheDocument()
  })

  it('produto sem avaliação mostra botão "Avaliar" que abre o formulário', async () => {
    server.use(http.get('/api/reviews/me', () => HttpResponse.json([unreviewedItem()])))
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Teclado Mecânico')
    await user.click(screen.getByRole('button', { name: /avaliar/i }))

    expect(screen.getByRole('button', { name: /enviar avaliação/i })).toBeInTheDocument()
  })

  it('cria uma avaliação enviando fotos e fecha o formulário', async () => {
    let uploadCalls = 0
    let createBody: unknown = null
    server.use(
      http.get('/api/reviews/me', () => HttpResponse.json([unreviewedItem()])),
      http.post('/api/upload/image', () => {
        uploadCalls += 1
        return HttpResponse.json({ url: `https://cdn.example.com/${uploadCalls}.jpg` })
      }),
      http.post('/api/products/p1/reviews', async ({ request }) => {
        createBody = await request.json()
        return HttpResponse.json(makeReview({ rating: 5, comment: 'Ótimo!' }), { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Teclado Mecânico')
    await user.click(screen.getByRole('button', { name: /avaliar/i }))

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
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /enviar avaliação/i })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
  })

  it('produto já avaliado mostra a avaliação com botões Editar e Excluir', async () => {
    server.use(http.get('/api/reviews/me', () => HttpResponse.json([reviewedItem()])))
    renderPage()

    await screen.findByText('Razoável')
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^avaliar$/i })).not.toBeInTheDocument()
  })

  it('editar abre o formulário pré-preenchido e salva via PUT', async () => {
    let updateBody: unknown = null
    server.use(
      http.get('/api/reviews/me', () => HttpResponse.json([reviewedItem()])),
      http.put('/api/products/p1/reviews/review-1', async ({ request }) => {
        updateBody = await request.json()
        return HttpResponse.json(makeReview({ rating: 1, comment: 'Mudei de ideia' }))
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Razoável')
    await user.click(screen.getByRole('button', { name: /editar/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText(/comentário/i)).toHaveValue('Razoável')

    await user.click(within(dialog).getByRole('radio', { name: /1 star/i }))
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    await waitFor(() =>
      expect(updateBody).toMatchObject({ rating: 1, comment: 'Razoável', imageUrls: [] }),
    )
    await screen.findByText('Mudei de ideia')
  })

  it('excluir avaliação pede confirmação e remove via DELETE', async () => {
    let deleteCalled = false
    server.use(
      http.get('/api/reviews/me', () => HttpResponse.json([reviewedItem()])),
      http.delete('/api/products/p1/reviews/review-1', () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Razoável')
    await user.click(screen.getByRole('button', { name: /excluir/i }))
    await user.click(screen.getByRole('button', { name: /^excluir$/i }))

    await waitFor(() => expect(deleteCalled).toBe(true))
    await waitFor(() => expect(screen.getByRole('button', { name: /avaliar/i })).toBeInTheDocument())
  })

  it('mostra toast de erro e mantém o formulário aberto quando o backend falha', async () => {
    server.use(
      http.get('/api/reviews/me', () => HttpResponse.json([unreviewedItem()])),
      http.post('/api/products/p1/reviews', () =>
        HttpResponse.json({ message: 'Você já avaliou este produto.' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Teclado Mecânico')
    await user.click(screen.getByRole('button', { name: /avaliar/i }))
    await user.click(screen.getByRole('radio', { name: /3 star/i }))
    await user.click(screen.getByRole('button', { name: /enviar avaliação/i }))

    expect((await screen.findAllByText(/você já avaliou este produto/i)).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /enviar avaliação/i })).toBeInTheDocument()
  })
})
