import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import EmployeesPage from '../employees/page'
import { useAuthStore } from '@/stores/auth.store'
import type { Employee } from '@/types'

const mockEmployees: Employee[] = [
  { id: 'emp-1', name: 'Ana Costa', email: 'ana@test.com', role: 'EMPLOYEE' },
]

const newEmployee: Employee = {
  id: 'emp-2',
  name: 'Carlos Melo',
  email: 'carlos@test.com',
  role: 'EMPLOYEE',
}

const server = setupServer(
  http.get('/api/admin/employees', () => HttpResponse.json(mockEmployees)),
  http.post('/api/admin/employees', () => HttpResponse.json(newEmployee, { status: 201 })),
  http.delete('/api/admin/employees/:id', () => new HttpResponse(null, { status: 204 })),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
})

function renderPage() {
  return render(
    <ToastProvider>
      <EmployeesPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('EmployeesPage — Gestão de Funcionários', () => {
  it('exibe heading "Gestão de Funcionários"', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /gestão de funcionários/i })).toBeInTheDocument()
  })

  it('exibe a lista de funcionários após o carregamento', async () => {
    renderPage()
    expect(await screen.findByText('Ana Costa')).toBeInTheDocument()
    expect(screen.getByText('ana@test.com')).toBeInTheDocument()
  })

  it('botão "Novo funcionário" abre dialog de cadastro', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /novo funcionário/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('submissão do form chama POST e adiciona o funcionário à lista', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /novo funcionário/i }))
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText(/nome/i), 'Carlos Melo')
    await user.type(within(dialog).getByLabelText(/e-mail/i), 'carlos@test.com')
    await user.type(within(dialog).getByLabelText(/senha/i), 'senhaSegura1')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Carlos Melo')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('botão Excluir chama DELETE e remove o funcionário da lista', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /excluir ana costa/i }))

    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument()
  })

  it('exibe toast de erro se o fetch de listagem falhar', async () => {
    server.use(http.get('/api/admin/employees', () => HttpResponse.json({}, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao carregar funcionários/i)
  })
})
