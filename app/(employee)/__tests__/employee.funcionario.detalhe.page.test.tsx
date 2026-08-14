import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

import { ToastProvider, ToastViewport } from 'base-ds'
import { EmployeeFuncionarioDetailContent } from '../dashboard/employees/[id]/EmployeeFuncionarioDetailContent'
import { useAuthStore } from '@/stores/auth.store'
import type { AuditLogPage, EmployeeDetailResponse } from '@/types'

const mockEmployee: EmployeeDetailResponse = {
  id: 'emp-1',
  name: 'Carlos Dias',
  email: 'carlos@test.com',
  role: 'EMPLOYEE',
  permissions: ['MANAGE_ORDERS'],
  createdAt: '2024-01-01T00:00:00Z',
  photoUrl: 'https://example.com/avatar.jpg',
}

const mockAuditLogs: AuditLogPage = {
  content: [
    {
      id: 1,
      entityType: 'PRODUCT',
      entityId: 'p-1',
      action: 'UPDATED',
      actorEmail: 'carlos@test.com',
      actorRole: 'EMPLOYEE',
      createdAt: '2024-01-02T00:00:00Z',
    },
  ],
  totalElements: 1,
  totalPages: 1,
  size: 10,
  number: 0,
}

const server = setupServer(
  http.get('/api/admin/employees/:id', () => HttpResponse.json(mockEmployee)),
  http.get('/api/admin/employees/:id/audit-logs', () => HttpResponse.json(mockAuditLogs)),
  http.put('/api/admin/employees/:id/permissions', async ({ request }) => {
    const body = (await request.json()) as { permissions: string[] }
    return HttpResponse.json({ ...mockEmployee, permissions: body.permissions })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
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
    user: {
      id: 'manager-1',
      name: 'Manager',
      email: 'manager@test.com',
      role: 'EMPLOYEE',
      permissions: ['MANAGE_EMPLOYEES'],
    },
  })
})

function renderDetail(id = 'emp-1') {
  return render(
    <ToastProvider>
      <EmployeeFuncionarioDetailContent id={id} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('EmployeeFuncionarioDetailContent', () => {
  it('exibe nome e email do funcionário', async () => {
    renderDetail()
    expect(await screen.findByText('Carlos Dias')).toBeInTheDocument()
    expect(screen.getByText('carlos@test.com')).toBeInTheDocument()
  })

  it('exibe Avatar com src do photoUrl', async () => {
    renderDetail()
    await screen.findByText('Carlos Dias')
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', expect.stringContaining('example.com/avatar.jpg'))
  })

  it('DuelingPicklist mostra permissões atribuídas à direita', async () => {
    renderDetail()
    await screen.findByText('Carlos Dias')
    const assignedList = screen.getByRole('listbox', { name: /atribuídas/i })
    expect(assignedList).toHaveTextContent(/gerenciamento de pedidos/i)
  })

  it('"Salvar permissões" chama PUT /permissions', async () => {
    let captured: unknown = null
    server.use(
      http.put('/api/admin/employees/:id/permissions', async ({ request }) => {
        captured = await request.json()
        return HttpResponse.json({ ...mockEmployee, permissions: ['MANAGE_ORDERS', 'MANAGE_PRODUCTS'] })
      }),
    )
    const user = userEvent.setup()
    renderDetail()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('option', { name: /gerenciamento de produtos/i }))
    await user.click(screen.getByRole('button', { name: /mover selecionado para a direita/i }))
    await user.click(screen.getByRole('button', { name: /salvar permissões/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/permissões salvas/i)
    expect(captured).toMatchObject({
      permissions: expect.arrayContaining(['MANAGE_ORDERS', 'MANAGE_PRODUCTS']),
    })
  })

  it('"Redefinir senha" está visível e desabilitado', async () => {
    renderDetail()
    await screen.findByText('Carlos Dias')
    const btn = screen.getByRole('button', { name: /redefinir senha/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
  })

  it('exibe histórico de ações do funcionário', async () => {
    renderDetail()
    await screen.findByText('Carlos Dias')
    expect(await screen.findByText(/UPDATED/i)).toBeInTheDocument()
  })

  it('exibe link "← Voltar" para /dashboard/employees', async () => {
    renderDetail()
    const link = await screen.findByRole('link', { name: /voltar/i })
    expect(link).toHaveAttribute('href', '/dashboard/employees')
  })

  it('exibe mensagem quando funcionário não é encontrado', async () => {
    server.use(http.get('/api/admin/employees/:id', () => new HttpResponse(null, { status: 404 })))
    renderDetail('nao-existe')
    expect(await screen.findByText(/não encontrado/i)).toBeInTheDocument()
  })

  it('redireciona para /dashboard quando usuário não tem MANAGE_EMPLOYEES', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'] },
    })
    await act(async () => {
      render(<ToastProvider><EmployeeFuncionarioDetailContent id="emp-1" /></ToastProvider>)
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
