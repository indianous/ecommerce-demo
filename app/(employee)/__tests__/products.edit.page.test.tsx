import { act, render, screen, waitFor, within } from '@testing-library/react'
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
import { ProductEditContent } from '../dashboard/products/[id]/edit/ProductEditContent'
import { useAuthStore } from '@/stores/auth.store'
import type { Category, Product } from '@/types'

const mockCategory: Category = { id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' }

const mockProduct: Product = {
  id: 'prod-1',
  categories: [mockCategory],
  name: 'Teclado Mecânico',
  slug: 'teclado-mecanico',
  price: 499.9,
  stockQuantity: 10,
  imageUrls: ['https://cdn.example.com/teclado.jpg'],
  active: true,
  status: 'AVAILABLE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

let lastPutBody: Record<string, unknown> = {}
let lastPatchStatusBody: Record<string, unknown> = {}
let currentProduct: Product = mockProduct
let deleteCalled = false

const server = setupServer(
  http.get('/api/categories', () => HttpResponse.json([mockCategory])),
  http.get('/api/admin/products/:id', () => HttpResponse.json(currentProduct)),
  http.put('/api/admin/products/:id', async ({ request }) => {
    const body = await request.json()
    lastPutBody = body as Record<string, unknown>
    return HttpResponse.json({ ...(body as object), id: 'prod-1' })
  }),
  http.patch('/api/admin/products/:id/status', async ({ request }) => {
    lastPatchStatusBody = (await request.json()) as Record<string, unknown>
    currentProduct = { ...currentProduct, status: lastPatchStatusBody.status as Product['status'] }
    return HttpResponse.json(currentProduct)
  }),
  http.delete('/api/admin/products/:id', () => {
    deleteCalled = true
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/upload/image', () => HttpResponse.json({ url: '/uploads/uuid-test.jpg' })),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  pushMock.mockClear()
  lastPutBody = {}
  lastPatchStatusBody = {}
  currentProduct = mockProduct
  deleteCalled = false
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

function renderEdit(id = 'prod-1') {
  return render(
    <ToastProvider>
      <ProductEditContent id={id} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('ProductEditContent', () => {
  it('exibe heading "Editar Produto"', async () => {
    renderEdit()
    expect(await screen.findByRole('heading', { name: /editar produto/i })).toBeInTheDocument()
  })

  it('pré-preenche o formulário com os dados do produto', async () => {
    renderEdit()
    expect(await screen.findByDisplayValue('Teclado Mecânico')).toBeInTheDocument()
  })

  it('pré-preenche o formulário com as imagens (imageUrls) do produto', async () => {
    renderEdit()
    const preview = await screen.findByRole('img', { name: /imagem 1 do produto/i })
    expect(preview).toHaveAttribute('src', 'https://cdn.example.com/teclado.jpg')
  })

  it('exibe link "← Voltar" para /dashboard/products', async () => {
    renderEdit()
    const link = await screen.findByRole('link', { name: /voltar/i })
    expect(link).toHaveAttribute('href', '/dashboard/products')
  })

  it('submeter form envia PUT /api/admin/products/:id e navega de volta', async () => {
    const user = userEvent.setup()
    renderEdit()

    const nameInput = await screen.findByDisplayValue('Teclado Mecânico')
    await user.clear(nameInput)
    await user.type(nameInput, 'Teclado Atualizado')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(lastPutBody.name).toBe('Teclado Atualizado')
      expect(pushMock).toHaveBeenCalledWith('/dashboard/products')
    })
  })

  it('pré-preenche o campo Slug com o slug atual do produto', async () => {
    renderEdit()
    await screen.findByDisplayValue('Teclado Mecânico')
    expect(screen.getByLabelText(/^slug/i)).toHaveValue('teclado-mecanico')
  })

  it('editar o slug propaga no payload do PUT', async () => {
    const user = userEvent.setup()
    renderEdit()

    await screen.findByDisplayValue('Teclado Mecânico')
    const slugInput = screen.getByLabelText(/^slug/i)
    await user.clear(slugInput)
    await user.type(slugInput, 'novo-slug')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(lastPutBody.slug).toBe('novo-slug')
    })
  })

  it('não exibe campo de estoque no formulário de edição', async () => {
    renderEdit()
    await screen.findByDisplayValue('Teclado Mecânico')
    expect(screen.queryByLabelText(/estoque/i)).not.toBeInTheDocument()
  })

  it('exibe mensagem quando produto não é encontrado', async () => {
    server.use(http.get('/api/admin/products/:id', () => new HttpResponse(null, { status: 404 })))
    renderEdit('nao-existe')
    expect(await screen.findByText(/não encontrado/i)).toBeInTheDocument()
  })
})

describe('ProductEditContent — seção Ações', () => {
  it('exibe o status atual do produto', async () => {
    renderEdit()
    await screen.findByDisplayValue('Teclado Mecânico')
    expect(screen.getByText('Disponível')).toBeInTheDocument()
  })

  it('switch de disponibilidade começa marcado para produto AVAILABLE', async () => {
    renderEdit()
    await screen.findByDisplayValue('Teclado Mecânico')
    expect(screen.getByRole('switch', { name: /produto disponível/i })).toHaveAttribute('aria-checked', 'true')
  })

  it('desligar o switch chama PATCH com status UNAVAILABLE e atualiza o badge sem sair da página', async () => {
    const user = userEvent.setup()
    renderEdit()
    await screen.findByDisplayValue('Teclado Mecânico')

    const toggle = screen.getByRole('switch', { name: /produto disponível/i })
    await user.click(toggle)

    await waitFor(() => {
      expect(lastPatchStatusBody).toMatchObject({ status: 'UNAVAILABLE' })
    })
    expect(await screen.findByText('Indisponível')).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('botão "Excluir produto" abre dialog de confirmação; cancelar não chama DELETE', async () => {
    const user = userEvent.setup()
    renderEdit()
    await screen.findByDisplayValue('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /excluir produto/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleteCalled).toBe(false)
  })

  it('confirmar exclusão chama DELETE /api/admin/products/:id e navega pra backPath', async () => {
    const user = userEvent.setup()
    renderEdit()
    await screen.findByDisplayValue('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /excluir produto/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(deleteCalled).toBe(true)
      expect(pushMock).toHaveBeenCalledWith('/dashboard/products')
    })
  })
})
