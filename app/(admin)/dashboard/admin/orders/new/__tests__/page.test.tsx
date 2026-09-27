import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dashboard/admin/orders/new',
  useSearchParams: () => new URLSearchParams(),
}))

import { ToastProvider } from '@indianous/base-ds'
import AdminNewOrderPage from '../page'
import { useAuthStore } from '@/stores/auth.store'

const server = setupServer(
  http.get('/api/admin/manual-orders/customers', () =>
    HttpResponse.json([{ id: 'c1', name: 'Ana Souza', email: 'ana@test.com', phone: null, cpf: null }])),
  http.get('/api/admin/manual-orders/customers/:id/addresses', () => HttpResponse.json([])),
  http.get('/api/catalog/products', () => HttpResponse.json({
    content: [{ id: 'p1', name: 'Laptop', slug: 'laptop', price: 100, effectivePrice: 100, stockQuantity: 5, categories: [], imageUrls: [], freeShipping: false, active: true }],
    totalPages: 1,
  })),
  http.get('/api/site/distribution-centers', () => HttpResponse.json([
    { id: 'dc1', name: 'CD Centro', street: 'Av. B', number: '10', district: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01310100', active: true },
  ])),
  http.get('/api/site/payment-methods', () => HttpResponse.json({ DELIVERY: ['PIX'], PICKUP: ['PAY_ON_PICKUP'] })),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'tok', isAuthenticated: true, role: 'ADMIN',
    user: { id: 'a', name: 'Admin', email: 'a@test.com', role: 'ADMIN', permissions: [], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null },
  })
})

describe('AdminNewOrderPage', () => {
  it('o admin vê o "Pagamento já recebido" sem precisar de MANAGE_PAYMENTS', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><AdminNewOrderPage /></ToastProvider>)

    expect(screen.getByRole('heading', { name: /novo pedido/i })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/buscar cliente/i), 'ana{Enter}')
    await user.click(await screen.findByRole('button', { name: /selecionar ana souza/i }))
    await user.type(screen.getByLabelText(/buscar produto/i), 'lap{Enter}')
    await user.click(await screen.findByRole('button', { name: /adicionar laptop/i }))
    await user.click(screen.getByRole('radio', { name: /retirada/i }))

    expect(screen.getByRole('switch', { name: /pagamento já recebido/i })).toBeInTheDocument()
  })
})
