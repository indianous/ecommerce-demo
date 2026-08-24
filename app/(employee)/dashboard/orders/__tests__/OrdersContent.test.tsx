import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { OrdersContent } from '../OrdersContent'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminOrderPage } from '@/types'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
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
      status: 'PENDING',
      totalAmount: 100,
      paymentMethod: 'PIX',
      paymentStatus: 'PENDING',
      itemCount: 1,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 2,
  totalPages: 1,
  last: true,
}

const server = setupServer(http.get('/api/admin/orders', () => HttpResponse.json(mockPage)))

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
      permissions: ['MANAGE_ORDERS' as const],
    },
  })
})

function renderContent(orderBasePath?: string) {
  return render(
    <ToastProvider>
      <OrdersContent orderBasePath={orderBasePath} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('OrdersContent — listagem', () => {
  it('renderiza heading e tabela de pedidos vinda da API', async () => {
    renderContent()
    expect(screen.getByRole('heading', { name: 'Gestão de Pedidos' })).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: 'Bruno Souza' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Nº' })).toBeInTheDocument()
  })

  it('exibe botão de copiar ao lado do nome e do e-mail do cliente', async () => {
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })
    expect(screen.getAllByRole('button', { name: 'Copiar nome do cliente' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Copiar e-mail do cliente' }).length).toBeGreaterThan(0)
  })

  it('botão "Ver detalhe" navega para orderBasePath/{id}', async () => {
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })
    await userEvent.click(screen.getByRole('button', { name: /ver detalhe do pedido 42/i }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/orders/order-2')
  })

  it('botão "Ver detalhe" respeita orderBasePath customizado', async () => {
    renderContent('/dashboard/admin/orders')
    await screen.findByRole('cell', { name: 'Bruno Souza' })
    await userEvent.click(screen.getByRole('button', { name: /ver detalhe do pedido 42/i }))
    expect(pushMock).toHaveBeenCalledWith('/dashboard/admin/orders/order-2')
  })

  it('estado vazio mostra mensagem em português, não "No data"', async () => {
    server.use(
      http.get('/api/admin/orders', () =>
        HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true }),
      ),
    )
    renderContent()
    expect(await screen.findByText(/nenhum pedido/i)).toBeInTheDocument()
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

  it('clicar no cabeçalho "Status" ordena as linhas', async () => {
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })

    const header = screen.getByRole('columnheader', { name: 'Status' })
    await userEvent.click(header.querySelector('button')!)
    const rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Confirmado')
  })
})

describe('OrdersContent — filtros', () => {
  it('marcar 2 status e clicar "Aplicar" chama a API com os dois status no query string', async () => {
    let capturedUrl = ''
    server.use(
      http.get('/api/admin/orders', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(mockPage)
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })

    const statusFilterButton = screen.getAllByRole('button', { name: /^status/i }).find((btn) => !btn.closest('table'))!
    await user.click(statusFilterButton)
    await user.click(screen.getByRole('checkbox', { name: 'Pendente' }))
    await user.click(screen.getByRole('checkbox', { name: 'Confirmado' }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await new Promise((r) => setTimeout(r, 0))
    const params = new URL(capturedUrl).searchParams.getAll('status')
    expect(params).toEqual(['PENDING', 'CONFIRMED'])
  })

  it('marcar um status sem clicar em "Aplicar" não dispara nova chamada à API', async () => {
    let callCount = 0
    server.use(
      http.get('/api/admin/orders', () => {
        callCount += 1
        return HttpResponse.json(mockPage)
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })
    const callsBeforeFilter = callCount

    const statusFilterButton = screen.getAllByRole('button', { name: /^status/i }).find((btn) => !btn.closest('table'))!
    await user.click(statusFilterButton)
    await user.click(screen.getByRole('checkbox', { name: 'Pendente' }))

    expect(callCount).toBe(callsBeforeFilter)
  })
})

describe('OrdersContent — busca', () => {
  it('digitar no campo de busca não dispara nova chamada à API', async () => {
    let callCount = 0
    server.use(
      http.get('/api/admin/orders', () => {
        callCount += 1
        return HttpResponse.json(mockPage)
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })
    const callsBeforeTyping = callCount

    await user.type(screen.getByRole('textbox', { name: 'Buscar pedidos' }), '42')

    expect(callCount).toBe(callsBeforeTyping)
  })

  it('clicar no botão de busca dispara a chamada com o termo no query param', async () => {
    let capturedUrl = ''
    server.use(
      http.get('/api/admin/orders', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(mockPage)
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })

    await user.type(screen.getByRole('textbox', { name: 'Buscar pedidos' }), 'Bruno')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    await new Promise((r) => setTimeout(r, 0))
    expect(new URL(capturedUrl).searchParams.get('search')).toBe('Bruno')
  })
})
