import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import { SolicitacoesContent } from '@/components/content/dashboard/sales/SolicitacoesContent'
import { useAuthStore } from '@/stores/auth.store'
import type { OrderChangeRequest } from '@/types'

const pushMock = vi.fn()
let mockSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => '/dashboard/change-requests',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

const mockRequests: OrderChangeRequest[] = [
  {
    id: 'req-2',
    orderId: 'order-2',
    orderNumber: 20,
    requestedByEmail: 'bruno@test.com',
    fromStatus: 'CONFIRMED',
    toStatus: 'SHIPPED',
    justification: 'Cliente pediu urgência',
    attachmentUrls: [],
    status: 'PENDING',
    resolvedByEmail: null,
    resolvedAt: null,
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'req-1',
    orderId: 'order-1',
    orderNumber: 10,
    requestedByEmail: 'ana@test.com',
    fromStatus: 'PENDING',
    toStatus: 'CONFIRMED',
    justification: 'Pagamento confirmado manualmente',
    attachmentUrls: [],
    status: 'APPROVED',
    resolvedByEmail: 'super@test.com',
    resolvedAt: '2026-01-03T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
]

const mockPage = { content: mockRequests, page: 0, size: 20, totalElements: mockRequests.length, totalPages: 1, last: true }

const server = setupServer(
  http.get('/api/admin/orders/change-requests', () => HttpResponse.json(mockPage)),
)

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
      permissions: ['MANAGE_ORDER_STATUS_REQUESTS' as const],
     phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
  })
})

function renderContent() {
  return render(
    <ToastProvider>
      <SolicitacoesContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('SolicitacoesContent — listagem', () => {
  it('renderiza heading e tabela de solicitações vinda da API', async () => {
    renderContent()
    expect(screen.getByRole('heading', { name: 'Solicitações de Status' })).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: '#20' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Pedido' })).toBeInTheDocument()
    expect(screen.getByText('bruno@test.com')).toBeInTheDocument()
  })

  it('botão "Ver detalhe" abre a tela de detalhe da solicitação', async () => {
    renderContent()
    await screen.findByRole('cell', { name: '#20' })
    const buttons = screen.getAllByRole('button', { name: 'Ver detalhe' })
    await userEvent.click(buttons[0])
    expect(await screen.findByRole('heading', { name: 'Solicitação #20' })).toBeInTheDocument()
  })

  it('estado vazio mostra mensagem em português, não "No data"', async () => {
    server.use(http.get('/api/admin/orders/change-requests', () => HttpResponse.json({ content: [] })))
    renderContent()
    expect(await screen.findByText(/nenhuma solicitação encontrada/i)).toBeInTheDocument()
    expect(screen.queryByText('No data')).not.toBeInTheDocument()
  })

  it('clicar no cabeçalho "Pedido" ordena as linhas (asc, depois desc)', async () => {
    renderContent()
    await screen.findByRole('cell', { name: '#20' })

    const header = screen.getByRole('columnheader', { name: 'Pedido' })
    await userEvent.click(header.querySelector('button')!)
    let rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('#10')
    expect(rows[1]).toContain('#20')

    await userEvent.click(header.querySelector('button')!)
    rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('#20')
    expect(rows[1]).toContain('#10')
  })

  it('clicar no cabeçalho "Status" ordena as linhas', async () => {
    renderContent()
    await screen.findByRole('cell', { name: '#20' })

    const header = screen.getByRole('columnheader', { name: 'Status' })
    await userEvent.click(header.querySelector('button')!)
    const rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Aprovada')
  })
})

describe('SolicitacoesContent — filtros', () => {
  it('marcar 2 status e clicar "Aplicar" chama a API com os dois status no query string', async () => {
    let capturedUrl = ''
    server.use(
      http.get('/api/admin/orders/change-requests', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ content: mockRequests })
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: '#20' })

    const statusFilterButton = screen.getAllByRole('button', { name: /^status/i }).find((btn) => !btn.closest('table'))!
    await user.click(statusFilterButton)
    await user.click(screen.getByRole('checkbox', { name: 'Pendente' }))
    await user.click(screen.getByRole('checkbox', { name: 'Aprovada' }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await new Promise((r) => setTimeout(r, 0))
    const params = new URL(capturedUrl).searchParams.getAll('status')
    expect(params).toEqual(['PENDING', 'APPROVED'])
  })

  it('marcar um status sem clicar em "Aplicar" não dispara nova chamada à API', async () => {
    let callCount = 0
    server.use(
      http.get('/api/admin/orders/change-requests', () => {
        callCount += 1
        return HttpResponse.json({ content: mockRequests })
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: '#20' })
    const callsBeforeFilter = callCount

    const statusFilterButton = screen.getAllByRole('button', { name: /^status/i }).find((btn) => !btn.closest('table'))!
    await user.click(statusFilterButton)
    await user.click(screen.getByRole('checkbox', { name: 'Rejeitada' }))

    expect(callCount).toBe(callsBeforeFilter)
  })
})

describe('SolicitacoesContent — busca', () => {
  it('digitar no campo de busca não dispara nova chamada à API', async () => {
    let callCount = 0
    server.use(
      http.get('/api/admin/orders/change-requests', () => {
        callCount += 1
        return HttpResponse.json({ content: mockRequests })
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: '#20' })
    const callsBeforeTyping = callCount

    await user.type(screen.getByRole('textbox', { name: 'Buscar solicitações' }), '20')

    expect(callCount).toBe(callsBeforeTyping)
  })

  it('clicar no botão de busca dispara a chamada com o termo no query param', async () => {
    let capturedUrl = ''
    server.use(
      http.get('/api/admin/orders/change-requests', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ content: mockRequests })
      }),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: '#20' })

    await user.type(screen.getByRole('textbox', { name: 'Buscar solicitações' }), '20')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    await new Promise((r) => setTimeout(r, 0))
    expect(new URL(capturedUrl).searchParams.get('search')).toBe('20')
  })
})

describe('SolicitacoesContent — paginação', () => {
  it('com totalPages<=1, não exibe navegação de página', async () => {
    renderContent()
    await screen.findByRole('cell', { name: '#20' })
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('URL com ?page=2 carrega a página 2 direto', async () => {
    mockSearch = 'page=2'
    let lastUrl = ''
    server.use(
      http.get('/api/admin/orders/change-requests', ({ request }) => {
        lastUrl = request.url
        return HttpResponse.json({ ...mockPage, page: 1, totalPages: 3, last: false })
      }),
    )
    renderContent()
    await screen.findByRole('cell', { name: '#20' })

    expect(new URL(lastUrl).searchParams.get('page')).toBe('1')
  })

  it('clicar em "Next page" atualiza a URL para ?page=2', async () => {
    server.use(
      http.get('/api/admin/orders/change-requests', () =>
        HttpResponse.json({ ...mockPage, totalPages: 3, last: false }),
      ),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByRole('cell', { name: '#20' })

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/change-requests?page=2')
  })
})
