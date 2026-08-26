import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { ExpiringLotsContent } from '@/components/content/ExpiringLotsContent'
import { useAuthStore } from '@/stores/auth.store'
import type { StockLot } from '@/types'

const pushMock = vi.fn()
let mockSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: pushMock }),
  usePathname: () => '/dashboard/stock/expiring',
  useSearchParams: () => new URLSearchParams(mockSearch),
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

const mockLot2: StockLot = {
  ...mockLot,
  id: 'lot-2',
  productName: 'Abajur de Mesa',
  lotNumber: 'L2',
  quantity: 2,
  expiryDate: '2026-06-01',
}

let lastUrl = ''
let lotsResponse: StockLot[] = [mockLot]

const server = setupServer(
  http.get('/api/admin/stock-lots/expiring', ({ request }) => {
    lastUrl = request.url
    return HttpResponse.json({
      content: lotsResponse, page: 0, size: 20, totalElements: lotsResponse.length, totalPages: 1, last: true,
    })
  }),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  lastUrl = ''
  lotsResponse = [mockLot]
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

  it('estado vazio mostra mensagem em português, não "No data"', async () => {
    lotsResponse = []
    renderExpiring()
    expect(await screen.findByText(/nenhum lote vencendo/i)).toBeInTheDocument()
    expect(screen.queryByText('No data')).not.toBeInTheDocument()
  })

  it('clicar no cabeçalho "Produto" ordena as linhas (asc, depois desc)', async () => {
    lotsResponse = [mockLot, mockLot2]
    const user = userEvent.setup()
    renderExpiring()
    await screen.findByText('Teclado Mecânico')

    const header = screen.getByRole('columnheader', { name: 'Produto' })
    await user.click(within(header).getByRole('button'))
    let rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Abajur de Mesa')

    await user.click(within(header).getByRole('button'))
    rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Teclado Mecânico')
  })

  it('clicar no cabeçalho "Saldo" ordena as linhas', async () => {
    lotsResponse = [mockLot, mockLot2]
    const user = userEvent.setup()
    renderExpiring()
    await screen.findByText('Teclado Mecânico')

    const header = screen.getByRole('columnheader', { name: 'Saldo' })
    await user.click(within(header).getByRole('button'))
    const rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Abajur de Mesa')
  })

  it('clicar no cabeçalho "Validade" ordena as linhas por data', async () => {
    lotsResponse = [mockLot, mockLot2]
    const user = userEvent.setup()
    renderExpiring()
    await screen.findByText('Teclado Mecânico')

    const header = screen.getByRole('columnheader', { name: 'Validade' })
    await user.click(within(header).getByRole('button'))
    const rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Abajur de Mesa')
  })
})

describe('ExpiringLotsContent — busca', () => {
  it('digitar no campo de busca não dispara nova chamada à API', async () => {
    const user = userEvent.setup()
    renderExpiring()
    await screen.findByText('Teclado Mecânico')
    const urlBeforeTyping = lastUrl

    await user.type(screen.getByRole('textbox', { name: 'Buscar lotes' }), 'L1')

    expect(lastUrl).toBe(urlBeforeTyping)
  })

  it('clicar no botão de busca dispara a chamada com o termo no query param', async () => {
    const user = userEvent.setup()
    renderExpiring()
    await screen.findByText('Teclado Mecânico')

    await user.type(screen.getByRole('textbox', { name: 'Buscar lotes' }), 'L1')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(new URL(lastUrl).searchParams.get('search')).toBe('L1')
  })
})

describe('ExpiringLotsContent — paginação', () => {
  it('com totalPages<=1, não exibe navegação de página', async () => {
    renderExpiring()
    await screen.findByText('Teclado Mecânico')
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('URL com ?page=2 carrega a página 2 direto', async () => {
    mockSearch = 'page=2'
    server.use(
      http.get('/api/admin/stock-lots/expiring', ({ request }) => {
        lastUrl = request.url
        return HttpResponse.json({ content: lotsResponse, page: 1, size: 20, totalElements: 3, totalPages: 3, last: false })
      }),
    )
    renderExpiring()
    await screen.findByText('Teclado Mecânico')

    expect(new URL(lastUrl).searchParams.get('page')).toBe('1')
  })

  it('clicar em "Next page" atualiza a URL para ?page=2', async () => {
    server.use(
      http.get('/api/admin/stock-lots/expiring', () =>
        HttpResponse.json({ content: lotsResponse, page: 0, size: 20, totalElements: 3, totalPages: 3, last: false }),
      ),
    )
    const user = userEvent.setup()
    renderExpiring()
    await screen.findByText('Teclado Mecânico')

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/stock/expiring?page=2')
  })
})
