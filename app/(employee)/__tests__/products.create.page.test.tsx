import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}))

import { ToastProvider, ToastViewport } from 'base-ds'
import { ProductCreateContent } from '../dashboard/products/new/ProductCreateContent'
import { useAuthStore } from '@/stores/auth.store'
import type { Category } from '@/types'

const mockCategory: Category = { id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' }

let lastSavedBody: Record<string, unknown> = {}

const server = setupServer(
  http.get('/api/categories', () => HttpResponse.json([mockCategory])),
  http.post('/api/admin/products', async ({ request }) => {
    const body = await request.json()
    lastSavedBody = body as Record<string, unknown>
    return HttpResponse.json(
      { ...(body as object), id: 'prod-new', status: 'AVAILABLE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      { status: 201 },
    )
  }),
  http.post('/api/upload/image', () => HttpResponse.json({ url: '/uploads/uuid-test.jpg' })),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  pushMock.mockClear()
  lastSavedBody = {}
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'] },
  })
})

function renderCreate() {
  return render(
    <ToastProvider>
      <ProductCreateContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('ProductCreateContent', () => {
  it('exibe heading "Novo Produto"', async () => {
    renderCreate()
    expect(await screen.findByRole('heading', { name: /novo produto/i })).toBeInTheDocument()
  })

  it('exibe formulário com campos vazios', async () => {
    renderCreate()
    expect(await screen.findByLabelText(/^nome/i)).toHaveValue('')
  })

  it('exibe link "← Voltar" para /dashboard/products', async () => {
    renderCreate()
    const link = await screen.findByRole('link', { name: /voltar/i })
    expect(link).toHaveAttribute('href', '/dashboard/products')
  })

  it('submeter form envia POST /api/admin/products e navega de volta', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.type(await screen.findByLabelText(/^nome/i), 'Novo Teclado')
    await user.click(screen.getByRole('checkbox', { name: 'Eletrônicos' }))
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(lastSavedBody.name).toBe('Novo Teclado')
      expect(pushMock).toHaveBeenCalledWith('/dashboard/products')
    })
  })

  it('não exibe campo de estoque no formulário de criação', async () => {
    renderCreate()
    await screen.findByLabelText(/^nome/i)
    expect(screen.queryByLabelText(/estoque/i)).not.toBeInTheDocument()
  })

  it('exibe input de arquivo no formulário', async () => {
    renderCreate()
    await screen.findByLabelText(/^nome/i)
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument()
  })

  it('faz POST para /api/upload/image ao selecionar arquivo e exibe preview', async () => {
    const user = userEvent.setup()
    renderCreate()
    await screen.findByLabelText(/^nome/i)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['bytes'], 'foto.jpg', { type: 'image/jpeg' }))

    const preview = await screen.findByRole('img', { name: /imagem 1 do produto/i })
    expect(preview).toHaveAttribute('src', '/uploads/uuid-test.jpg')
  })

  it('exibe campos Slug, Meta título e Meta descrição, todos opcionais', async () => {
    renderCreate()
    expect(await screen.findByLabelText(/^slug/i)).toHaveValue('')
    expect(screen.getByLabelText(/meta título/i)).toHaveValue('')
    expect(screen.getByLabelText(/meta descrição/i)).toHaveValue('')
  })

  it('slug vazio não bloqueia o submit — backend gera automaticamente', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.type(await screen.findByLabelText(/^nome/i), 'Produto Sem Slug')
    await user.click(screen.getByRole('checkbox', { name: 'Eletrônicos' }))
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(lastSavedBody.name).toBe('Produto Sem Slug')
      expect(lastSavedBody.slug).toBe('')
      expect(pushMock).toHaveBeenCalledWith('/dashboard/products')
    })
  })

  it('preenche slug/meta título/meta descrição e propaga no payload', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.type(await screen.findByLabelText(/^nome/i), 'Produto Com SEO')
    await user.click(screen.getByRole('checkbox', { name: 'Eletrônicos' }))
    await user.type(screen.getByLabelText(/^slug/i), 'produto-com-seo')
    await user.type(screen.getByLabelText(/meta título/i), 'Produto Com SEO — Loja')
    await user.type(screen.getByLabelText(/meta descrição/i), 'Descrição para buscadores')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(lastSavedBody.slug).toBe('produto-com-seo')
      expect(lastSavedBody.metaTitle).toBe('Produto Com SEO — Loja')
      expect(lastSavedBody.metaDescription).toBe('Descrição para buscadores')
    })
  })

  it('inclui imageUrls no payload ao salvar', async () => {
    const user = userEvent.setup()
    renderCreate()

    await screen.findByLabelText(/^nome/i)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['bytes'], 'foto.jpg', { type: 'image/jpeg' }))
    await screen.findByRole('img', { name: /imagem 1 do produto/i })

    await user.type(screen.getByLabelText(/^nome/i), 'Produto com Imagem')
    await user.click(screen.getByRole('checkbox', { name: 'Eletrônicos' }))
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(lastSavedBody.imageUrls).toEqual(['/uploads/uuid-test.jpg'])
    })
  })
})
