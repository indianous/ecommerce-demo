import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => '/dashboard/customers',
  useSearchParams: () => new URLSearchParams(),
}))
import { ToastProvider, ToastViewport } from 'base-ds'
import ClientesPage from '../dashboard/customers/page'
import { useAuthStore } from '@/stores/auth.store'

const mockCustomers = [
  { id: 'c-1', name: 'João Silva', email: 'joao@test.com' },
  { id: 'c-2', name: 'Maria Costa', email: 'maria@test.com' },
]

let capturedSearch = ''

const server = setupServer(
  http.get('/api/admin/customers', ({ request }) => {
    const { searchParams } = new URL(request.url)
    capturedSearch = searchParams.get('search') ?? ''
    const filtered = mockCustomers.filter(
      (c) => !capturedSearch || c.name.includes(capturedSearch) || c.email.includes(capturedSearch),
    )
    return HttpResponse.json({
      content: filtered,
      totalPages: 1,
      totalElements: filtered.length,
      size: 20,
      page: 0,
      last: true,
    })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  capturedSearch = ''
  replaceMock.mockClear()
  pushMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_CUSTOMERS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const},
  })
})

function renderPage() {
  return render(
    <ToastProvider>
      <ClientesPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('Clientes Page', () => {
  it('exibe heading "Gestão de Clientes"', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /gestão de clientes/i })).toBeInTheDocument()
  })

  it('lista clientes com nome e email', async () => {
    renderPage()
    expect(await screen.findByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('joao@test.com')).toBeInTheDocument()
    expect(screen.getByText('Maria Costa')).toBeInTheDocument()
    expect(screen.getByText('maria@test.com')).toBeInTheDocument()
  })

  it('campo de busca envia ?search= ao BFF', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('João Silva')

    const input = screen.getByRole('textbox', { name: /buscar clientes/i })
    await user.type(input, 'João')
    await user.click(screen.getByRole('button', { name: /buscar/i }))

    await waitFor(() => {
      expect(capturedSearch).toBe('João')
    })
  })

  it('clicar em "Ver detalhe" navega para /dashboard/customers/:id', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('João Silva')

    await user.click(screen.getAllByRole('button', { name: /ver detalhe/i })[0])

    expect(pushMock).toHaveBeenCalledWith('/dashboard/customers/c-1')
  })

  it('não exibe detalhe inline na página de lista', async () => {
    renderPage()
    await screen.findByText('João Silva')
    expect(screen.queryByRole('region', { name: /detalhe do cliente/i })).not.toBeInTheDocument()
  })

  it('exibe toast de erro quando API falha', async () => {
    server.use(
      http.get('/api/admin/customers', () => HttpResponse.json({}, { status: 500 })),
    )
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao carregar clientes/i)
  })
})

describe('ClientesPage — controle de acesso', () => {
  it('redireciona para /dashboard quando usuário não tem MANAGE_CUSTOMERS', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const},
    })
    await act(async () => {
      render(
        <ToastProvider>
          <ClientesPage />
        </ToastProvider>,
      )
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
