import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => '/dashboard/employees',
  useSearchParams: () => new URLSearchParams(),
}))
import { ToastProvider, ToastViewport } from 'base-ds'
import EmployeeFuncionariosPage from '../dashboard/employees/page'
import { useAuthStore } from '@/stores/auth.store'
import type { Employee } from '@/types'

const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Carlos Dias',
    email: 'carlos@test.com',
    role: 'EMPLOYEE',
    permissions: ['MANAGE_ORDERS', 'MANAGE_PRODUCTS'],
    passwordSet: true,
    emailVerified: true,
  },
  {
    id: 'emp-2',
    name: 'Fernanda Melo',
    email: 'fernanda@test.com',
    role: 'EMPLOYEE',
    permissions: [],
    passwordSet: true,
    emailVerified: true,
  },
]

const newEmployee: Employee = {
  id: 'emp-3',
  name: 'Lucas Ramos',
  email: 'lucas@test.com',
  role: 'EMPLOYEE',
  permissions: [],
  passwordSet: true,
  emailVerified: true,
}

const server = setupServer(
  http.get('/api/admin/employees', () =>
    HttpResponse.json({ content: mockEmployees, page: 0, size: 20, totalElements: mockEmployees.length, totalPages: 1, last: true }),
  ),
  http.post('/api/admin/employees', () => HttpResponse.json(newEmployee, { status: 201 })),
  http.delete('/api/admin/employees/:id', () => new HttpResponse(null, { status: 204 })),
  http.put('/api/admin/employees/:id/permissions', () =>
    HttpResponse.json({ permissions: ['MANAGE_ORDERS'] }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
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
    user: {
      id: 'manager-1',
      name: 'Manager',
      email: 'manager@test.com',
      role: 'EMPLOYEE',
      permissions: ['MANAGE_EMPLOYEES'],
     phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
  })
})

function renderPage() {
  return render(
    <ToastProvider>
      <EmployeeFuncionariosPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('Employee Funcionários Page — listagem', () => {
  it('exibe heading "Gestão de Funcionários"', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /gestão de funcionários/i })).toBeInTheDocument()
  })

  it('exibe lista de funcionários carregados da API', async () => {
    renderPage()
    expect(await screen.findByText('Carlos Dias')).toBeInTheDocument()
    expect(screen.getByText('carlos@test.com')).toBeInTheDocument()
    expect(screen.getByText('Fernanda Melo')).toBeInTheDocument()
  })
})

describe('Employee Funcionários Page — criação', () => {
  it('botão "Novo funcionário" abre dialog de cadastro', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('button', { name: /novo funcionário/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('submissão do form chama POST e adiciona o funcionário à lista', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('button', { name: /novo funcionário/i }))
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText(/nome/i), 'Lucas Ramos')
    await user.type(within(dialog).getByLabelText(/e-mail/i), 'lucas@test.com')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Lucas Ramos')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Employee Funcionários Page — exclusão', () => {
  it('botão Excluir abre confirmação; confirmar chama DELETE e remove o funcionário da lista', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('button', { name: /excluir carlos dias/i }))
    expect(screen.getByRole('dialog', { name: /excluir funcionário/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    expect(screen.queryByText('Carlos Dias')).not.toBeInTheDocument()
  })

  it('cancelar a confirmação não exclui o funcionário', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('button', { name: /excluir carlos dias/i }))
    await user.click(screen.getByRole('button', { name: /^cancelar$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Carlos Dias')).toBeInTheDocument()
  })
})

describe('Employee Funcionários Page — editar (permissões)', () => {
  it('exibe botão "Editar" para cada funcionário', async () => {
    renderPage()
    await screen.findByText('Carlos Dias')

    expect(screen.getByRole('button', { name: /editar carlos dias/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /editar fernanda melo/i })).toBeInTheDocument()
  })

  it('clicar em "Editar" abre Dialog com nome do funcionário', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('button', { name: /editar carlos dias/i }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/carlos dias/i)).toBeInTheDocument()
  })

  it('Dialog exibe checkboxes para todas as 9 permissões', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('button', { name: /editar carlos dias/i }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByLabelText(/gerenciamento de pedidos/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/gerenciamento de produtos/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/gestão de clientes/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/gestão de estoque/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/gestão de envios/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/gestão de pagamento/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/restaurar produtos/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/gestão de funcionários/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/solicitações de status/i)).toBeInTheDocument()
  })

  it('checkboxes refletem permissões atuais do funcionário', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('button', { name: /editar carlos dias/i }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByLabelText(/gerenciamento de pedidos/i)).toBeChecked()
    expect(within(dialog).getByLabelText(/gerenciamento de produtos/i)).toBeChecked()
    expect(within(dialog).getByLabelText(/gestão de clientes/i)).not.toBeChecked()
  })

  it('salvar permissões chama PUT e exibe toast de sucesso', async () => {
    let capturedBody: unknown = null
    server.use(
      http.put('/api/admin/employees/:id/permissions', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ permissions: ['MANAGE_ORDERS'] })
      }),
    )

    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Fernanda Melo')

    await user.click(screen.getByRole('button', { name: /editar fernanda melo/i }))
    const dialog = screen.getByRole('dialog')

    await user.click(within(dialog).getByLabelText(/gerenciamento de pedidos/i))
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/permissões.*salvas/i)
    expect(capturedBody).toMatchObject({ permissions: expect.arrayContaining(['MANAGE_ORDERS']) })
  })

  it('Dialog fecha ao clicar em Cancelar', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('button', { name: /editar carlos dias/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('EmployeeFuncionariosPage — controle de acesso', () => {
  it('redireciona para /dashboard quando usuário não tem MANAGE_EMPLOYEES', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
    })
    await act(async () => {
      render(<ToastProvider><EmployeeFuncionariosPage /></ToastProvider>)
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
