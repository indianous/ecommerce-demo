import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import EmployeesPage from '../funcionarios/page'
import { useAuthStore } from '@/stores/auth.store'
import type { Employee } from '@/types'

const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Ana Costa',
    email: 'ana@test.com',
    role: 'EMPLOYEE',
    permissions: ['MANAGE_ORDERS', 'MANAGE_PRODUCTS'],
  },
  {
    id: 'emp-2',
    name: 'Bruno Lima',
    email: 'bruno@test.com',
    role: 'EMPLOYEE',
    permissions: [],
  },
]

const server = setupServer(
  http.get('/api/admin/employees', () => HttpResponse.json(mockEmployees)),
  http.put('/api/admin/employees/:id/permissions', () =>
    HttpResponse.json({ permissions: ['MANAGE_ORDERS'] }),
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

describe('EmployeesPage — Gestão de Permissões', () => {
  it('exibe botão "Permissões" para cada funcionário na tabela', async () => {
    renderPage()
    await screen.findByText('Ana Costa')

    expect(screen.getByRole('button', { name: /permissões de ana costa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /permissões de bruno lima/i })).toBeInTheDocument()
  })

  it('clicar em "Permissões" abre Dialog com título do funcionário', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /permissões de ana costa/i }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/ana costa/i)).toBeInTheDocument()
  })

  it('Dialog exibe checkboxes para todas as 9 permissões', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /permissões de ana costa/i }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByLabelText(/gerenciamento de produtos/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/gestão de clientes/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/gerenciamento de pedidos/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/gestão de estoque/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/gestão de envios/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/gestão de pagamento/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/restaurar produtos/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/gestão de funcionários/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/solicitações de status/i)).toBeInTheDocument()
  })

  it('checkboxes refletem as permissões atuais do funcionário', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /permissões de ana costa/i }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByLabelText(/gerenciamento de produtos/i)).toBeChecked()
    expect(within(dialog).getByLabelText(/gerenciamento de pedidos/i)).toBeChecked()
    expect(within(dialog).getByLabelText(/gestão de clientes/i)).not.toBeChecked()
  })

  it('salvar envia PUT /api/admin/employees/{id}/permissions com permissões corretas', async () => {
    let capturedBody: unknown = null
    server.use(
      http.put('/api/admin/employees/:id/permissions', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ permissions: ['MANAGE_ORDERS'] })
      }),
    )

    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Bruno Lima')

    await user.click(screen.getByRole('button', { name: /permissões de bruno lima/i }))
    const dialog = screen.getByRole('dialog')

    await user.click(within(dialog).getByLabelText(/gerenciamento de pedidos/i))
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    await screen.findByRole('alert')
    expect(capturedBody).toMatchObject({ permissions: expect.arrayContaining(['MANAGE_ORDERS']) })
  })

  it('exibe toast de sucesso após salvar permissões', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /permissões de ana costa/i }))
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/permissões.*salvas/i)
  })

  it('Dialog fecha ao clicar em Cancelar', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /permissões de ana costa/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
