import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))
import { ToastProvider, ToastViewport } from 'base-ds'
import ClientesPage from '../customers/page'
import { useAuthStore } from '@/stores/auth.store'

const mockCustomers = [
  { id: 'c-1', name: 'João Silva', email: 'joao@test.com' },
  { id: 'c-2', name: 'Maria Costa', email: 'maria@test.com' },
]

const mockDetail = {
  id: 'c-1',
  name: 'João Silva',
  email: 'joao@test.com',
  createdAt: '2024-01-01T00:00:00Z',
  addresses: [
    {
      id: 'a-1',
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 4',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000',
      isDefault: true,
    },
  ],
}

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
  http.get('/api/admin/customers/:id', ({ params }) =>
    params.id === 'c-1'
      ? HttpResponse.json(mockDetail)
      : HttpResponse.json({ message: 'Not found' }, { status: 404 }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  capturedSearch = ''
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
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_CUSTOMERS'] },
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

  it('clicar em cliente abre detalhe com endereços', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('João Silva')

    await user.click(screen.getAllByRole('button', { name: /ver detalhe/i })[0])

    expect(await screen.findByRole('region', { name: /detalhe do cliente/i })).toBeInTheDocument()
    expect(screen.getByText(/rua das flores/i)).toBeInTheDocument()
  })

  it('detalhe exibe rua, número, bairro, cidade, estado, CEP', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('João Silva')

    await user.click(screen.getAllByRole('button', { name: /ver detalhe/i })[0])

    await screen.findByRole('region', { name: /detalhe do cliente/i })
    expect(screen.getByText(/rua das flores.*123/i)).toBeInTheDocument()
    expect(screen.getByText(/centro.*são paulo.*sp/i)).toBeInTheDocument()
    expect(screen.getByText(/01000-000/i)).toBeInTheDocument()
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
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'] },
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
