import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/dashboard/change-requests',
  useSearchParams: () => new URLSearchParams(),
}))
import { ToastProvider, ToastViewport } from 'base-ds'
import SolicitacoesPage from '../dashboard/change-requests/page'
import { useAuthStore } from '@/stores/auth.store'
import type { OrderChangeRequest } from '@/types'

const mockRequest: OrderChangeRequest = {
  id: 'cr-1',
  orderId: 'o-1',
  orderNumber: 100,
  requestedByEmail: 'emp@test.com',
  fromStatus: 'CONFIRMED',
  toStatus: 'PENDING',
  justification: 'Precisa de retrocesso',
  attachmentUrls: [],
  status: 'PENDING',
  resolvedByEmail: null,
  resolvedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
}

const mockApprovedRequest: OrderChangeRequest = {
  ...mockRequest,
  id: 'cr-2',
  orderNumber: 200,
  status: 'APPROVED',
  resolvedByEmail: 'gestor@test.com',
}

let requests: OrderChangeRequest[] = [mockRequest]

const server = setupServer(
  http.get('/api/admin/orders/change-requests', ({ request }) => {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.getAll('status')
    const search = searchParams.get('search') ?? ''
    let filtered = [...requests]
    if (statusFilter.length > 0) filtered = filtered.filter((r) => statusFilter.includes(r.status))
    if (search) filtered = filtered.filter((r) => String(r.orderNumber).includes(search))
    return HttpResponse.json({
      content: filtered,
      totalPages: 1,
      totalElements: filtered.length,
      size: 20,
      page: 0,
      last: true,
    })
  }),
  http.patch('/api/admin/orders/change-requests/:id/approve', ({ params }) => {
    const updated = { ...mockRequest, id: params.id as string, status: 'APPROVED' as const }
    requests = requests.map((r) => (r.id === params.id ? updated : r))
    return HttpResponse.json(updated)
  }),
  http.patch('/api/admin/orders/change-requests/:id/reject', ({ params }) => {
    const updated = { ...mockRequest, id: params.id as string, status: 'REJECTED' as const }
    requests = requests.map((r) => (r.id === params.id ? updated : r))
    return HttpResponse.json(updated)
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  requests = [mockRequest]
  replaceMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDER_STATUS_REQUESTS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const},
  })
})

function renderPage() {
  return render(
    <ToastProvider>
      <SolicitacoesPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('Solicitações Page', () => {
  it('exibe heading "Solicitações de Status"', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /solicitações de status/i })).toBeInTheDocument()
  })

  it('lista solicitações com número do pedido, status da solicitação', async () => {
    renderPage()
    expect(await screen.findByText('#100')).toBeInTheDocument()
    expect(screen.getByText('emp@test.com')).toBeInTheDocument()
  })

  it('exibe badge PENDING para solicitação pendente', async () => {
    renderPage()
    expect(await screen.findByText('Pendente')).toBeInTheDocument()
  })

  it('filtro de status Pendente: marcar e "Aplicar" envia ?status=PENDING', async () => {
    requests = [mockRequest, mockApprovedRequest]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('#100')

    const statusFilterButton = screen.getAllByRole('button', { name: /^status/i }).find((btn) => !btn.closest('table'))!
    await user.click(statusFilterButton)
    await user.click(screen.getByRole('checkbox', { name: 'Pendente' }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await waitFor(() => {
      expect(screen.getByText('#100')).toBeInTheDocument()
      expect(screen.queryByText('#200')).not.toBeInTheDocument()
    })
  })

  it('campo de busca por número do pedido envia ?search= ao clicar no botão de busca', async () => {
    requests = [mockRequest, mockApprovedRequest]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('#100')

    const input = screen.getByPlaceholderText(/buscar/i)
    await user.type(input, '200')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    await waitFor(() => {
      expect(screen.queryByText('#100')).not.toBeInTheDocument()
      expect(screen.getByText('#200')).toBeInTheDocument()
    })
  })

  it('digitar no campo de busca sem clicar no botão não filtra a lista', async () => {
    requests = [mockRequest, mockApprovedRequest]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('#100')

    const input = screen.getByPlaceholderText(/buscar/i)
    await user.type(input, '200')

    expect(screen.getByText('#100')).toBeInTheDocument()
  })

  it('clicar em "Ver detalhe" abre detalhe com justificativa', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('#100')

    await user.click(screen.getByRole('button', { name: /ver detalhe/i }))

    expect(await screen.findByText('Precisa de retrocesso')).toBeInTheDocument()
  })

  it('detalhe PENDING exibe botões Aceitar e Negar', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('#100')

    await user.click(screen.getByRole('button', { name: /ver detalhe/i }))
    await screen.findByText('Precisa de retrocesso')

    expect(screen.getByRole('button', { name: /aceitar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /negar/i })).toBeInTheDocument()
  })

  it('clicar Aceitar chama PATCH /approve e atualiza badge para APPROVED', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('#100')

    await user.click(screen.getByRole('button', { name: /ver detalhe/i }))
    await screen.findByText('Precisa de retrocesso')

    await user.click(screen.getByRole('button', { name: /aceitar/i }))

    expect(await screen.findByText('Aprovada')).toBeInTheDocument()
  })

  it('clicar Negar abre dialog de confirmação, sem chamar PATCH /reject direto', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('#100')

    await user.click(screen.getByRole('button', { name: /ver detalhe/i }))
    await screen.findByText('Precisa de retrocesso')

    await user.click(screen.getByRole('button', { name: /negar/i }))

    expect(await screen.findByRole('heading', { name: /negar solicitação/i })).toBeInTheDocument()
    expect(screen.queryByText('Rejeitada')).not.toBeInTheDocument()
  })

  it('confirmar no dialog de Negar chama PATCH /reject e atualiza badge para REJECTED', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('#100')

    await user.click(screen.getByRole('button', { name: /ver detalhe/i }))
    await screen.findByText('Precisa de retrocesso')

    await user.click(screen.getByRole('button', { name: /negar/i }))
    await screen.findByRole('heading', { name: /negar solicitação/i })
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(await screen.findByText('Rejeitada')).toBeInTheDocument()
  })

  it('cancelar no dialog de Negar fecha sem chamar PATCH /reject', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('#100')

    await user.click(screen.getByRole('button', { name: /ver detalhe/i }))
    await screen.findByText('Precisa de retrocesso')

    await user.click(screen.getByRole('button', { name: /negar/i }))
    await screen.findByRole('heading', { name: /negar solicitação/i })
    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /negar solicitação/i })).not.toBeInTheDocument()
    })
    expect(screen.queryByText('Rejeitada')).not.toBeInTheDocument()
  })

  it('detalhe APPROVED: sem botões Aceitar/Negar, badge mostra Aprovada', async () => {
    requests = [mockApprovedRequest]
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('#200')

    await user.click(screen.getByRole('button', { name: /ver detalhe/i }))
    await screen.findByText('Precisa de retrocesso')

    expect(screen.queryByRole('button', { name: /aceitar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /negar/i })).not.toBeInTheDocument()
    expect(screen.getByText('Aprovada')).toBeInTheDocument()
  })
})

describe('SolicitacoesPage — controle de acesso', () => {
  it('redireciona para /dashboard quando usuário não tem MANAGE_ORDER_STATUS_REQUESTS', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const},
    })
    await act(async () => {
      render(
        <ToastProvider>
          <SolicitacoesPage />
        </ToastProvider>,
      )
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
