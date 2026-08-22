import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { OrdersContent } from '../OrdersContent'
import { useAuthStore } from '@/stores/auth.store'
import type { OrderResponse } from '@/types'

function makeOrder(overrides: Partial<OrderResponse>): OrderResponse {
  return {
    id: 'order-1',
    orderNumber: 10,
    status: 'CONFIRMED',
    totalAmount: 199.9,
    paymentMethod: 'PIX',
    paymentStatus: 'PAID',
    createdAt: '2026-01-01T00:00:00Z',
    items: [{ productId: 'prod-1', productName: 'Teclado Mecânico', quantity: 1, unitPrice: 199.9, subtotal: 199.9 }],
    ...overrides,
  }
}

let ordersResponse: OrderResponse[] = [makeOrder({})]

const server = setupServer(http.get('/api/orders', () => HttpResponse.json(ordersResponse)))

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  ordersResponse = [makeOrder({})]
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
})

function renderContent() {
  return render(<OrdersContent />)
}

describe('OrdersContent (cliente)', () => {
  it('renderiza heading e a tabela de pedidos vinda da API', async () => {
    renderContent()
    expect(await screen.findByRole('cell', { name: '#10' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Meus Pedidos' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Pedido' })).toBeInTheDocument()
  })

  it('estado vazio mostra "Nenhum pedido encontrado."', async () => {
    ordersResponse = []
    renderContent()
    expect(await screen.findByText('Nenhum pedido encontrado.')).toBeInTheDocument()
  })

  it('clicar no botão de expandir mostra os itens do pedido, clicar de novo esconde', async () => {
    renderContent()
    await screen.findByRole('cell', { name: '#10' })

    expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /expand row/i }))
    expect(await screen.findByText('Teclado Mecânico')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Teclado Mecânico' })).toHaveAttribute('href', '/catalog/prod-1')

    await userEvent.click(screen.getByRole('button', { name: /collapse row/i }))
    expect(screen.queryByText('Teclado Mecânico')).not.toBeInTheDocument()
  })

  it('pagina os pedidos quando há mais que o tamanho da página', async () => {
    ordersResponse = Array.from({ length: 6 }, (_, i) =>
      makeOrder({ id: `order-${i}`, orderNumber: 100 + i }),
    )
    renderContent()
    await screen.findByRole('cell', { name: '#100' })
    expect(screen.queryByRole('cell', { name: '#105' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByRole('cell', { name: '#105' })).toBeInTheDocument()
  })
})
