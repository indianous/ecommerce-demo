import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { StockMovementHistoryContent } from '../StockMovementHistoryContent'
import { useAuthStore } from '@/stores/auth.store'
import type { StockMovement } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

const mockMovement: StockMovement = {
  id: 'mv-1',
  productId: 'prod-1',
  type: 'ENTRY',
  reason: 'PURCHASE',
  quantity: 20,
  quantityBefore: 10,
  quantityAfter: 30,
  lotId: 'lot-1',
  lotNumber: 'L1',
  lotExpiryDate: '2026-12-31',
  actorEmail: 'gestor@test.com',
  createdAt: '2026-06-01T10:00:00',
}

let lastMovementsUrl = ''

const server = setupServer(
  http.get('/api/admin/products/:id', () =>
    HttpResponse.json({ id: 'prod-1', name: 'Teclado Mecânico', categories: [{ id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' }] }),
  ),
  http.get('/api/admin/products/:id/stock-movements', ({ request }) => {
    lastMovementsUrl = request.url
    return HttpResponse.json({
      content: [mockMovement], page: 0, size: 20, totalElements: 1, totalPages: 1, last: true,
    })
  }),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  lastMovementsUrl = ''
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

function renderHistory() {
  return render(
    <ToastProvider>
      <StockMovementHistoryContent productId="prod-1" />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('StockMovementHistoryContent', () => {
  it('lista movimentações do produto com tipo, motivo, quantidade, antes/depois, lote, quem fez e quando', async () => {
    renderHistory()

    const row = await screen.findByText('PURCHASE')
    const tr = row.closest('tr') as HTMLElement
    expect(within(tr).getByText('ENTRY')).toBeInTheDocument()
    expect(within(tr).getByText('20')).toBeInTheDocument()
    expect(within(tr).getByText(/10.*30|30.*10/)).toBeInTheDocument()
    expect(within(tr).getByText(/L1/)).toBeInTheDocument()
    expect(within(tr).getByText('gestor@test.com')).toBeInTheDocument()
  })

  it('filtro por motivo refaz a busca com o query param correto', async () => {
    const user = userEvent.setup()
    renderHistory()
    await screen.findByText('PURCHASE')

    await user.selectOptions(screen.getByLabelText(/motivo/i), 'PURCHASE')

    expect(lastMovementsUrl).toContain('reason=PURCHASE')
  })

  it('filtro por intervalo de datas refaz a busca com os query params corretos', async () => {
    const user = userEvent.setup()
    renderHistory()
    await screen.findByText('PURCHASE')

    await user.type(screen.getByLabelText(/de/i), '2026-01-01')
    await user.type(screen.getByLabelText(/até/i), '2026-12-31')

    expect(lastMovementsUrl).toContain('from=2026-01-01')
    expect(lastMovementsUrl).toContain('to=2026-12-31')
  })
})
