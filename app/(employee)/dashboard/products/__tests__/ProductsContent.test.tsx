import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { ProductsContent } from '@/components/content/dashboard/catalog/ProductsContent'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminProductPage, Category } from '@/types'

const pushMock = vi.fn()
let mockSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/dashboard/products',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

const downloadBlobMock = vi.fn()
vi.mock('@/lib/downloadBlob', () => ({
  downloadBlob: (...args: unknown[]) => downloadBlobMock(...args),
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
  freeShipping: false,
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
  freeShipping: false,
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
  downloadBlobMock.mockClear()
  mockSearch = ''
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
     phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
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

describe('ProductsContent — paginação', () => {
  it('com totalPages<=1, não exibe navegação de página', async () => {
    renderContent()
    await screen.findByRole('cell', { name: 'Camiseta Branca' })
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('URL com ?page=2 carrega a página 2 direto', async () => {
    mockSearch = 'page=2'
    let lastUrl = ''
    server.use(
      http.get('/api/admin/products', ({ request }) => {
        lastUrl = request.url
        return HttpResponse.json({ ...mockPage, page: 1, totalPages: 3, last: false })
      }),
    )
    renderContent()
    await screen.findByRole('cell', { name: 'Camiseta Branca' })

    expect(new URL(lastUrl).searchParams.get('page')).toBe('1')
  })

  it('clicar em "Next page" atualiza a URL para ?page=2', async () => {
    server.use(
      http.get('/api/admin/products', () =>
        HttpResponse.json({ ...mockPage, totalPages: 3, last: false }),
      ),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Camiseta Branca' })

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/products?page=2')
  })
})

describe('ProductsContent — exportar CSV', () => {
  it('clicar em "Exportar CSV" chama o endpoint e dispara o download', async () => {
    let called = false
    server.use(
      http.get('/api/admin/products/export', ({ request }) => {
        called = true
        expect(request.headers.get('Authorization')).toBe('Bearer mock-token')
        return new HttpResponse('name,slug\nCamiseta,camiseta', {
          headers: { 'Content-Type': 'text/csv' },
        })
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Camiseta Branca' })

    await user.click(screen.getByRole('button', { name: /exportar csv/i }))

    await vi.waitFor(() => {
      expect(called).toBe(true)
      expect(downloadBlobMock).toHaveBeenCalledWith(expect.anything(), 'produtos.csv')
    })
  })

  it('erro no export mostra toast sem quebrar a tela', async () => {
    server.use(
      http.get('/api/admin/products/export', () => new HttpResponse(null, { status: 500 })),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Camiseta Branca' })

    await user.click(screen.getByRole('button', { name: /exportar csv/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao exportar/i)
  })
})

describe('ProductsContent — importar CSV', () => {
  it('clicar em "Importar CSV" abre o dialog com o campo de arquivo', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Camiseta Branca' })

    await user.click(screen.getByRole('button', { name: /importar csv/i }))

    expect(await screen.findByRole('dialog', { name: /importar produtos via csv/i })).toBeInTheDocument()
  })

  it('selecionar arquivo e confirmar importa via multipart/form-data e mostra o relatório', async () => {
    let receivedContentType = ''
    let hasFileField = false
    server.use(
      http.post('/api/admin/products/import', async ({ request }) => {
        receivedContentType = request.headers.get('Content-Type') ?? ''
        const formData = await request.formData()
        hasFileField = formData.get('file') !== null
        return HttpResponse.json({
          createdCount: 2,
          created: [
            { name: 'Camiseta', slug: 'camiseta', renamed: false },
            { name: 'Camiseta', slug: 'camiseta-2', renamed: true },
          ],
          errors: [{ row: 3, message: 'categoria inexistente: tenis' }],
          warnings: [{ row: 1, message: 'GTIN já usado por outro produto' }],
        })
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Camiseta Branca' })
    await user.click(screen.getByRole('button', { name: /importar csv/i }))
    await screen.findByRole('dialog', { name: /importar produtos via csv/i })

    const csvFile = new File(['name,slug\nCamiseta,camiseta'], 'produtos.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText(/file upload/i), csvFile)
    await user.click(screen.getByRole('button', { name: /confirmar importação/i }))

    expect(await screen.findByText(/2 produto\(s\) criado\(s\)/i)).toBeInTheDocument()
    expect(screen.getByText(/categoria inexistente: tenis/i)).toBeInTheDocument()
    expect(screen.getByText(/gtin já usado por outro produto/i)).toBeInTheDocument()
    expect(receivedContentType).toContain('multipart/form-data')
    expect(hasFileField).toBe(true)
  })

  it('sucesso no import recarrega a lista de produtos', async () => {
    let listCallCount = 0
    server.use(
      http.get('/api/admin/products', () => {
        listCallCount += 1
        return HttpResponse.json(mockPage)
      }),
      http.post('/api/admin/products/import', () =>
        HttpResponse.json({ createdCount: 1, created: [], errors: [], warnings: [] }),
      ),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Camiseta Branca' })
    const callsBeforeImport = listCallCount
    await user.click(screen.getByRole('button', { name: /importar csv/i }))
    await screen.findByRole('dialog', { name: /importar produtos via csv/i })

    const csvFile = new File(['name,slug\nCamiseta,camiseta'], 'produtos.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText(/file upload/i), csvFile)
    await user.click(screen.getByRole('button', { name: /confirmar importação/i }))

    await screen.findByText(/1 produto\(s\) criado\(s\)/i)
    expect(listCallCount).toBeGreaterThan(callsBeforeImport)
  })

  it('erro de rede no import mostra toast sem quebrar a tela', async () => {
    server.use(
      http.post('/api/admin/products/import', () => new HttpResponse(null, { status: 500 })),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Camiseta Branca' })
    await user.click(screen.getByRole('button', { name: /importar csv/i }))
    await screen.findByRole('dialog', { name: /importar produtos via csv/i })

    const csvFile = new File(['name,slug\nCamiseta,camiseta'], 'produtos.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText(/file upload/i), csvFile)
    await user.click(screen.getByRole('button', { name: /confirmar importação/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao importar/i)
  })
})
