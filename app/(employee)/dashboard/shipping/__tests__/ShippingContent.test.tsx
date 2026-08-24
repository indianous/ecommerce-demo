import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { ShippingContent } from '@/components/content/ShippingContent'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminOrderPage } from '@/types'

const pushMock = vi.fn()
let mockSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/dashboard/shipping',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

const mockPage: AdminOrderPage = {
  content: [
    {
      id: 'order-2',
      orderNumber: 42,
      customerName: 'Bruno Souza',
      customerEmail: 'bruno@test.com',
      status: 'CONFIRMED',
      totalAmount: 300,
      paymentMethod: 'PIX',
      paymentStatus: 'PAID',
      itemCount: 2,
      createdAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 'order-1',
      orderNumber: 10,
      customerName: 'Ana Lima',
      customerEmail: 'ana@test.com',
      status: 'CONFIRMED',
      totalAmount: 100,
      paymentMethod: 'PIX',
      paymentStatus: 'PAID',
      itemCount: 1,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
  page: 0,
  size: 50,
  totalElements: 2,
  totalPages: 1,
  last: true,
}

const server = setupServer(http.get('/api/admin/orders', () => HttpResponse.json(mockPage)))

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  pushMock.mockClear()
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
      permissions: ['MANAGE_SHIPPING' as const],
     phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const},
  })
})

function renderContent(orderBasePath?: string) {
  return render(
    <ToastProvider>
      <ShippingContent orderBasePath={orderBasePath} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('ShippingContent', () => {
  it('renderiza heading e tabela de pedidos confirmados aguardando envio', async () => {
    renderContent()
    expect(screen.getByRole('heading', { name: 'Gestão de Envios' })).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: 'Bruno Souza' })).toBeInTheDocument()
  })

  it('exibe botão de copiar ao lado do nome do cliente', async () => {
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })
    expect(screen.getAllByRole('button', { name: 'Copiar nome do cliente' })).toHaveLength(2)
  })

  it('botão "Ver pedido" navega para orderBasePath/{id}', async () => {
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })
    await userEvent.click(screen.getByRole('button', { name: /ver pedido 42/i }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/orders/order-2')
  })

  it('estado vazio mostra mensagem em português, não "No data"', async () => {
    server.use(
      http.get('/api/admin/orders', () =>
        HttpResponse.json({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0, last: true }),
      ),
    )
    renderContent()
    expect(await screen.findByText(/nenhum pedido aguardando envio/i)).toBeInTheDocument()
    expect(screen.queryByText('No data')).not.toBeInTheDocument()
  })

  it('clicar no cabeçalho "Nº" ordena as linhas (asc, depois desc)', async () => {
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })

    const header = screen.getByRole('columnheader', { name: 'Nº' })
    await userEvent.click(header.querySelector('button')!)
    let rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Ana Lima')

    await userEvent.click(header.querySelector('button')!)
    rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Bruno Souza')
  })

  it('clicar no cabeçalho "Total" ordena as linhas', async () => {
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })

    const header = screen.getByRole('columnheader', { name: 'Total' })
    await userEvent.click(header.querySelector('button')!)
    const rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Ana Lima')
  })
})

describe('ShippingContent — paginação', () => {
  it('com totalPages<=1, não exibe navegação de página', async () => {
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('URL com ?page=2 carrega a página 2 direto', async () => {
    mockSearch = 'page=2'
    let lastUrl = ''
    server.use(
      http.get('/api/admin/orders', ({ request }) => {
        lastUrl = request.url
        return HttpResponse.json({ ...mockPage, page: 1, totalPages: 3, last: false })
      }),
    )
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })

    expect(new URL(lastUrl).searchParams.get('page')).toBe('1')
  })

  it('clicar em "Next page" atualiza a URL para ?page=2', async () => {
    server.use(
      http.get('/api/admin/orders', () =>
        HttpResponse.json({ ...mockPage, totalPages: 3, last: false }),
      ),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/shipping?page=2')
  })
})
