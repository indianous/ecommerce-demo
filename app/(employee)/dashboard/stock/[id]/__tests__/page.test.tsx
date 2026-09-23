import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { StockMovementHistoryContent } from '@/components/content/dashboard/catalog/StockMovementHistoryContent'
import { useAuthStore } from '@/stores/auth.store'
import type { StockMovement } from '@/types'

const pushMock = vi.fn()
let mockSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: pushMock }),
  usePathname: () => '/dashboard/stock/prod-1',
  useSearchParams: () => new URLSearchParams(mockSearch),
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

const mockMovement2: StockMovement = {
  ...mockMovement,
  id: 'mv-2',
  reason: 'SALE',
  quantity: 5,
  quantityBefore: 30,
  quantityAfter: 25,
  createdAt: '2026-01-01T10:00:00',
}

let lastMovementsUrl = ''
let movementsResponse: StockMovement[] = [mockMovement]

const server = setupServer(
  http.get('/api/admin/products/:id', () =>
    HttpResponse.json({ id: 'prod-1', name: 'Teclado Mecânico', categories: [{ id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' }] }),
  ),
  http.get('/api/admin/products/:id/stock-movements', ({ request }) => {
    lastMovementsUrl = request.url
    return HttpResponse.json({
      content: movementsResponse, page: 0, size: 20, totalElements: movementsResponse.length, totalPages: 1, last: true,
    })
  }),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  lastMovementsUrl = ''
  movementsResponse = [mockMovement]
  pushMock.mockClear()
  mockSearch = ''
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_STOCK'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
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

  it('filtro por motivo: marcar 2 valores e "Aplicar" refaz a busca com os dois reason', async () => {
    const user = userEvent.setup()
    renderHistory()
    await screen.findByText('PURCHASE')

    await user.click(screen.getByRole('button', { name: /motivo/i }))
    await user.click(screen.getByRole('checkbox', { name: 'Compra' }))
    await user.click(screen.getByRole('checkbox', { name: 'Venda' }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    const params = new URL(lastMovementsUrl).searchParams.getAll('reason')
    expect(params).toEqual(['PURCHASE', 'SALE'])
  })

  it('marcar um motivo sem clicar em "Aplicar" não refaz a busca', async () => {
    const user = userEvent.setup()
    renderHistory()
    await screen.findByText('PURCHASE')
    const urlBeforeFilter = lastMovementsUrl

    await user.click(screen.getByRole('button', { name: /motivo/i }))
    await user.click(screen.getByRole('checkbox', { name: 'Compra' }))

    expect(lastMovementsUrl).toBe(urlBeforeFilter)
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

  it('clicar no cabeçalho "Quantidade" ordena as linhas (asc, depois desc)', async () => {
    movementsResponse = [mockMovement, mockMovement2]
    const user = userEvent.setup()
    renderHistory()
    await screen.findByText('PURCHASE')

    const header = screen.getByRole('columnheader', { name: 'Quantidade' })
    await user.click(within(header).getByRole('button'))
    let rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('SALE')

    await user.click(within(header).getByRole('button'))
    rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('PURCHASE')
  })

  it('clicar no cabeçalho "Quando" ordena as linhas por data', async () => {
    movementsResponse = [mockMovement, mockMovement2]
    const user = userEvent.setup()
    renderHistory()
    await screen.findByText('PURCHASE')

    const header = screen.getByRole('columnheader', { name: 'Quando' })
    await user.click(within(header).getByRole('button'))
    const rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('SALE')
  })
})

describe('StockMovementHistoryContent — busca', () => {
  it('digitar no campo de busca não dispara nova chamada à API', async () => {
    const user = userEvent.setup()
    renderHistory()
    await screen.findByText('PURCHASE')
    const urlBeforeTyping = lastMovementsUrl

    await user.type(screen.getByRole('textbox', { name: 'Buscar movimentações' }), 'L1')

    expect(lastMovementsUrl).toBe(urlBeforeTyping)
  })

  it('clicar no botão de busca dispara a chamada com o termo no query param', async () => {
    const user = userEvent.setup()
    renderHistory()
    await screen.findByText('PURCHASE')

    await user.type(screen.getByRole('textbox', { name: 'Buscar movimentações' }), 'L1')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(new URL(lastMovementsUrl).searchParams.get('search')).toBe('L1')
  })
})

describe('StockMovementHistoryContent — paginação', () => {
  it('com totalPages<=1, não exibe navegação de página', async () => {
    renderHistory()
    await screen.findByText('PURCHASE')
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('URL com ?page=2 carrega a página 2 direto', async () => {
    mockSearch = 'page=2'
    server.use(
      http.get('/api/admin/products/:id/stock-movements', ({ request }) => {
        lastMovementsUrl = request.url
        return HttpResponse.json({
          content: movementsResponse, page: 1, size: 20, totalElements: 3, totalPages: 3, last: false,
        })
      }),
    )
    renderHistory()
    await screen.findByText('PURCHASE')

    expect(new URL(lastMovementsUrl).searchParams.get('page')).toBe('1')
  })

  it('clicar em "Next page" atualiza a URL para ?page=2', async () => {
    server.use(
      http.get('/api/admin/products/:id/stock-movements', () =>
        HttpResponse.json({
          content: movementsResponse, page: 0, size: 20, totalElements: 3, totalPages: 3, last: false,
        }),
      ),
    )
    const user = userEvent.setup()
    renderHistory()
    await screen.findByText('PURCHASE')

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/stock/prod-1?page=2')
  })
})
