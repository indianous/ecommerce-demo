import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { ProductsContent } from '../ProductsContent'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminProductPage, Category } from '@/types'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const mockCategories: Category[] = [{ id: 'cat-1', name: 'Camisetas', slug: 'camisetas' }]

const mockPage: AdminProductPage = {
  content: [
    {
      id: 'prod-2',
      categories: [{ id: 'cat-1', name: 'Camisetas', slug: 'camisetas' }],
      name: 'Camiseta Branca',
      slug: 'camiseta-branca',
      price: 59.9,
      stockQuantity: 10,
      imageUrls: [],
      active: true,
      status: 'AVAILABLE',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 'prod-1',
      categories: [{ id: 'cat-1', name: 'Camisetas', slug: 'camisetas' }],
      name: 'Camiseta Preta',
      slug: 'camiseta-preta',
      price: 49.9,
      stockQuantity: 5,
      imageUrls: [],
      active: true,
      status: 'UNAVAILABLE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 2,
  totalPages: 1,
  last: true,
}

const server = setupServer(
  http.get('/api/admin/products', () => HttpResponse.json(mockPage)),
  http.get('/api/categories', () => HttpResponse.json(mockCategories)),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  pushMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    isAuthenticated: true,
    accessToken: 'mock-token',
    role: 'EMPLOYEE' as const,
    user: {
      id: '1',
      name: 'Func',
      email: 'func@test.com',
      role: 'EMPLOYEE' as const,
      permissions: ['MANAGE_PRODUCTS' as const],
    },
  })
})

function renderContent(basePath?: string) {
  return render(
    <ToastProvider>
      <ProductsContent basePath={basePath} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('ProductsContent — listagem', () => {
  it('renderiza heading e tabela de produtos vinda da API', async () => {
    renderContent()
    expect(await screen.findByRole('cell', { name: 'Camiseta Branca' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Gestão de Produtos' })).toBeInTheDocument()
  })

  it('estado vazio mostra mensagem em português, não "No data"', async () => {
    server.use(
      http.get('/api/admin/products', () =>
        HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true }),
      ),
    )
    renderContent()
    expect(await screen.findByText(/nenhum produto encontrado/i)).toBeInTheDocument()
    expect(screen.queryByText('No data')).not.toBeInTheDocument()
  })
})

describe('ProductsContent — filtros', () => {
  it('trocar a categoria no filtro dispara nova chamada à API imediatamente', async () => {
    let capturedUrl = ''
    server.use(
      http.get('/api/admin/products', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(mockPage)
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Camiseta Branca' })

    await user.click(screen.getByRole('button', { name: /^categoria/i }))
    await user.click(screen.getByRole('checkbox', { name: 'Camisetas' }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await new Promise((r) => setTimeout(r, 0))
    expect(new URL(capturedUrl).searchParams.getAll('categoryId')).toEqual(['cat-1'])
  })
})

describe('ProductsContent — busca', () => {
  it('digitar no campo de busca não dispara nova chamada à API', async () => {
    let callCount = 0
    server.use(
      http.get('/api/admin/products', () => {
        callCount += 1
        return HttpResponse.json(mockPage)
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Camiseta Branca' })
    const callsBeforeTyping = callCount

    await user.type(screen.getByRole('textbox', { name: 'Buscar produtos' }), 'camiseta')

    expect(callCount).toBe(callsBeforeTyping)
  })

  it('clicar no botão de busca dispara a chamada com o termo no query param', async () => {
    let capturedUrl = ''
    server.use(
      http.get('/api/admin/products', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(mockPage)
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Camiseta Branca' })

    await user.type(screen.getByRole('textbox', { name: 'Buscar produtos' }), 'branca')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    await new Promise((r) => setTimeout(r, 0))
    expect(new URL(capturedUrl).searchParams.get('search')).toBe('branca')
  })
})
