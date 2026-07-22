import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import ProductsManagementPage from '../products/page'
import { useAuthStore } from '@/stores/auth.store'
import type { Category, Product } from '@/types'

const mockCategory: Category = { id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' }

const mockProduct: Product = {
  id: 'prod-1',
  categoryId: 'cat-1',
  categoryName: 'Eletrônicos',
  name: 'Teclado Mecânico',
  price: 499.9,
  stockQuantity: 10,
  active: true,
}

let products: Product[] = []

let lastSavedBody: Record<string, unknown> = {}

const server = setupServer(
  http.get('/api/categories', () => HttpResponse.json([mockCategory])),
  http.get('/api/admin/products', () => HttpResponse.json(products)),
  http.post('/api/admin/products', async ({ request }) => {
    const body = (await request.json()) as Omit<Product, 'id'>
    lastSavedBody = body as Record<string, unknown>
    const created: Product = { ...body, id: 'prod-2' }
    products = [...products, created]
    return HttpResponse.json(created, { status: 201 })
  }),
  http.delete('/api/admin/products/:id', ({ params }) => {
    products = products.filter((p) => p.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/upload/image', () =>
    HttpResponse.json({ url: '/uploads/uuid-test.jpg' }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  products = [mockProduct]
  lastSavedBody = {}
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
})

function renderPage() {
  return render(
    <ToastProvider>
      <ProductsManagementPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('ProductsManagementPage', () => {
  it('renders existing products', async () => {
    renderPage()
    expect(await screen.findByText('Teclado Mecânico')).toBeInTheDocument()
  })

  it('opens the create dialog with empty fields', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /novo produto/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/nome/i)).toHaveValue('')
  })

  it('creates a new product', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /novo produto/i }))
    await screen.findByRole('dialog')

    await user.type(screen.getByLabelText(/nome/i), 'Mouse Gamer')
    await user.selectOptions(screen.getByLabelText(/categoria/i), 'cat-1')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Mouse Gamer')).toBeInTheDocument()
  })

  it('deletes a product', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /excluir teclado mecânico/i }))

    await waitFor(() => {
      expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()
    })
  })
})

describe('ProductsManagementPage — upload de imagem', () => {
  it('exibe input de arquivo no formulário de produto', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /novo produto/i }))
    await screen.findByRole('dialog')

    expect(document.querySelector('input[type="file"]')).toBeInTheDocument()
  })

  it('faz POST para /api/upload/image ao selecionar um arquivo', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /novo produto/i }))
    await screen.findByRole('dialog')

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['bytes'], 'foto.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      // preview image appears after successful upload
      expect(screen.getByRole('img', { name: /preview/i })).toBeInTheDocument()
    })
  })

  it('exibe preview com a URL retornada pelo servidor após upload', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /novo produto/i }))
    await screen.findByRole('dialog')

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['bytes'], 'foto.jpg', { type: 'image/jpeg' }))

    const preview = await screen.findByRole('img', { name: /preview/i })
    expect(preview).toHaveAttribute('src', '/uploads/uuid-test.jpg')
  })

  it('inclui imageUrl no payload ao salvar o produto', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /novo produto/i }))
    await screen.findByRole('dialog')

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['bytes'], 'foto.jpg', { type: 'image/jpeg' }))

    await screen.findByRole('img', { name: /preview/i })

    await user.type(screen.getByLabelText(/nome/i), 'Produto com Imagem')
    await user.selectOptions(screen.getByLabelText(/categoria/i), 'cat-1')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(lastSavedBody.imageUrl).toBe('/uploads/uuid-test.jpg')
    })
  })
})
