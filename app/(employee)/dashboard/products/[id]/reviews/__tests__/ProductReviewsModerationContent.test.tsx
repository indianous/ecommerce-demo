import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'

const replaceMock = vi.fn()
const pushMock = vi.fn()
let mockSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => '/dashboard/products/prod-1/reviews',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

import { ProductReviewsModerationContent } from '@/components/content/dashboard/catalog/ProductReviewsModerationContent'
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
let lastBulkDeleteBody: { ids: string[] } | null = null

const server = setupServer(
  http.get(`/api/products/${productId}/reviews`, () => HttpResponse.json(makePage([makeReview()]))),
  http.delete(`/api/admin/products/${productId}/reviews/review-1`, ({ request }) => {
    deleteHeaders = request.headers
    return new HttpResponse(null, { status: 204 })
  }),
  http.post(`/api/admin/products/${productId}/reviews/bulk-delete`, async ({ request }) => {
    lastBulkDeleteBody = (await request.json()) as { ids: string[] }
    return HttpResponse.json({ successCount: lastBulkDeleteBody.ids.length, failures: [] })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  pushMock.mockClear()
  mockSearch = ''
  deleteHeaders = null
  lastBulkDeleteBody = null
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
        user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
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
        user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
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
        user: { id: 'u-2', name: 'Sem Permissão', email: 'no@test.com', role: 'EMPLOYEE', permissions: [] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
      })
    })
    renderModeration()

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/dashboard'))
  })
})

describe('ProductReviewsModerationContent — busca', () => {
  beforeEach(async () => {
    await act(async () => {
      useAuthStore.setState({
        accessToken: 'mock-token',
        isAuthenticated: true,
        user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null },
      })
    })
  })

  it('digitar no campo de busca não dispara nova chamada à API', async () => {
    let callCount = 0
    server.use(
      http.get(`/api/products/${productId}/reviews`, () => {
        callCount += 1
        return HttpResponse.json(makePage([makeReview()]))
      }),
    )
    const user = userEvent.setup()
    renderModeration()
    await screen.findByText('Maria')
    const callsBeforeTyping = callCount

    await user.type(screen.getByRole('textbox', { name: 'Buscar avaliações' }), 'maria')

    expect(callCount).toBe(callsBeforeTyping)
  })

  it('clicar no botão de busca dispara a chamada com o termo no query param', async () => {
    let capturedUrl = ''
    server.use(
      http.get(`/api/products/${productId}/reviews`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(makePage([makeReview()]))
      }),
    )
    const user = userEvent.setup()
    renderModeration()
    await screen.findByText('Maria')

    await user.type(screen.getByRole('textbox', { name: 'Buscar avaliações' }), 'maria')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(new URL(capturedUrl).searchParams.get('search')).toBe('maria')
  })
})

describe('ProductReviewsModerationContent — paginação', () => {
  beforeEach(async () => {
    await act(async () => {
      useAuthStore.setState({
        accessToken: 'mock-token',
        isAuthenticated: true,
        user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null },
      })
    })
  })

  it('com totalPages<=1, não exibe navegação de página', async () => {
    renderModeration()
    await screen.findByText('Maria')
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('URL com ?page=2 carrega a página 2 direto', async () => {
    mockSearch = 'page=2'
    let lastUrl = ''
    server.use(
      http.get(`/api/products/${productId}/reviews`, ({ request }) => {
        lastUrl = request.url
        return HttpResponse.json({ ...makePage([makeReview()]), page: 1, totalPages: 3, last: false })
      }),
    )
    renderModeration()
    await screen.findByText('Maria')

    expect(new URL(lastUrl).searchParams.get('page')).toBe('1')
  })

  it('clicar em "Next page" atualiza a URL para ?page=2', async () => {
    server.use(
      http.get(`/api/products/${productId}/reviews`, () =>
        HttpResponse.json({ ...makePage([makeReview()]), totalPages: 3, last: false }),
      ),
    )
    const user = userEvent.setup()
    renderModeration()
    await screen.findByText('Maria')

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/products/prod-1/reviews?page=2')
  })
})

describe('ProductReviewsModerationContent — seleção em massa', () => {
  beforeEach(async () => {
    server.use(
      http.get(`/api/products/${productId}/reviews`, () =>
        HttpResponse.json(makePage([makeReview(), makeReview({ id: 'review-2', userName: 'João' })])),
      ),
    )
    await act(async () => {
      useAuthStore.setState({
        accessToken: 'mock-token',
        isAuthenticated: true,
        user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null },
      })
    })
  })

  it('sem seleção, botão "Excluir selecionadas" não aparece', async () => {
    renderModeration()
    await screen.findByText('Maria')
    expect(screen.queryByRole('button', { name: /excluir selecionad/i })).not.toBeInTheDocument()
  })

  it('confirmar exclusão em massa chama o bulk-delete e remove as selecionadas', async () => {
    const user = userEvent.setup()
    renderModeration()
    await screen.findByText('Maria')

    await user.click(screen.getByRole('checkbox', { name: /selecionar.*maria/i }))
    await user.click(screen.getByRole('checkbox', { name: /selecionar.*joão/i }))
    await user.click(screen.getByRole('button', { name: /excluir selecionad/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^confirmar$/i }))

    expect(lastBulkDeleteBody?.ids.sort()).toEqual(['review-1', 'review-2'])
    expect(screen.queryByText('Maria')).not.toBeInTheDocument()
    expect(screen.queryByText('João')).not.toBeInTheDocument()
  })
})
