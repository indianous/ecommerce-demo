import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { ShippingContent } from '../ShippingContent'
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
    },
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
