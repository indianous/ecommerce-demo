import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { ExpiringLotsContent } from '../ExpiringLotsContent'
import { useAuthStore } from '@/stores/auth.store'
import type { StockLot } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

const mockLot: StockLot = {
  id: 'lot-1',
  productId: 'prod-1',
  productName: 'Teclado Mecânico',
  lotNumber: 'L1',
  quantity: 5,
  initialQuantity: 10,
  expiryDate: '2026-08-15',
  createdAt: '2026-01-01T00:00:00',
}

let lastUrl = ''

const server = setupServer(
  http.get('/api/admin/stock-lots/expiring', ({ request }) => {
    lastUrl = request.url
    return HttpResponse.json([mockLot])
  }),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  lastUrl = ''
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_STOCK'] },
  })
})

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})

function renderExpiring() {
  return render(
    <ToastProvider>
      <ExpiringLotsContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('ExpiringLotsContent', () => {
  it('lista lotes vencendo/vencidos com produto, lote, saldo e validade, default 30 dias', async () => {
    renderExpiring()

    expect(await screen.findByText('Teclado Mecânico')).toBeInTheDocument()
    expect(screen.getByText('L1')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2026-08-15')).toBeInTheDocument()
    expect(lastUrl).toContain('days=30')
  })

  it('mudar o filtro de dias refaz a busca com o novo valor', async () => {
    const user = userEvent.setup()
    renderExpiring()
    await screen.findByText('Teclado Mecânico')

    const input = screen.getByLabelText(/dias/i)
    await user.clear(input)
    await user.type(input, '7')

    expect(lastUrl).toContain('days=7')
  })
})
