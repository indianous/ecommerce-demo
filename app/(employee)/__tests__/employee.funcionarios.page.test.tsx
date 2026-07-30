import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import EmployeeFuncionariosPage from '../funcionarios/page'
import { useAuthStore } from '@/stores/auth.store'
import type { Employee } from '@/types'

const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Carlos Dias',
    email: 'carlos@test.com',
    role: 'EMPLOYEE',
    permissions: ['MANAGE_ORDERS'],
  },
  {
    id: 'emp-2',
    name: 'Fernanda Melo',
    email: 'fernanda@test.com',
    role: 'EMPLOYEE',
    permissions: [],
  },
]

const server = setupServer(
  http.get('/api/admin/employees', () => HttpResponse.json(mockEmployees)),
  http.put('/api/admin/employees/:id/permissions', () =>
    HttpResponse.json({ permissions: ['MANAGE_ORDERS', 'MANAGE_PRODUCTS'] }),
  ),
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
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: {
      id: 'manager-1',
      name: 'Manager',
      email: 'manager@test.com',
      role: 'EMPLOYEE',
      permissions: ['MANAGE_EMPLOYEES'],
    },
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

describe('Employee Funcionários Page — Gestão de Permissões', () => {
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

  it('exibe checkboxes de permissões para cada funcionário', async () => {
    renderPage()
    await screen.findByText('Carlos Dias')

    const carlosRow = screen.getByText('Carlos Dias').closest('tr') as HTMLElement
    expect(within(carlosRow).getByLabelText(/gerenciamento de pedidos/i)).toBeInTheDocument()
    expect(within(carlosRow).getByLabelText(/gerenciamento de pedidos/i)).toBeChecked()
    expect(within(carlosRow).getByLabelText(/gerenciamento de produtos/i)).not.toBeChecked()
  })

  it('alterar checkbox e salvar envia PUT com novas permissões', async () => {
    let capturedBody: unknown = null
    let capturedId = ''
    server.use(
      http.put('/api/admin/employees/:id/permissions', async ({ request, params }) => {
        capturedId = params.id as string
        capturedBody = await request.json()
        return HttpResponse.json({ permissions: ['MANAGE_ORDERS', 'MANAGE_PRODUCTS'] })
      }),
    )

    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    const carlosRow = screen.getByText('Carlos Dias').closest('tr') as HTMLElement
    await user.click(within(carlosRow).getByLabelText(/gerenciamento de produtos/i))
    await user.click(within(carlosRow).getByRole('button', { name: /salvar/i }))

    await screen.findByRole('status')
    expect(capturedId).toBe('emp-1')
    expect(capturedBody).toMatchObject({
      permissions: expect.arrayContaining(['MANAGE_ORDERS', 'MANAGE_PRODUCTS']),
    })
  })

  it('exibe toast de sucesso após salvar', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    const carlosRow = screen.getByText('Carlos Dias').closest('tr') as HTMLElement
    await user.click(within(carlosRow).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/permissões.*salvas/i)
  })

  it('exibe toast de erro quando API falha', async () => {
    server.use(
      http.put('/api/admin/employees/:id/permissions', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    )

    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    const carlosRow = screen.getByText('Carlos Dias').closest('tr') as HTMLElement
    await user.click(within(carlosRow).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })
})
