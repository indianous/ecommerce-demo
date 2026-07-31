import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { EmployeeDetailPage } from '../funcionarios/[id]/EmployeeDetailContent'
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
  http.put('/api/admin/employees/:id/permissions', async ({ request }) => {
    const body = (await request.json()) as { permissions: string[] }
    return HttpResponse.json({ ...mockEmployee, permissions: body.permissions })
  }),
  http.get('/api/admin/employees/:id/audit-logs', () => HttpResponse.json(mockAuditLogs)),
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
      <EmployeeDetailPage id="emp-1" />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('Employee Detail Page', () => {
  it('exibe nome e email do funcionário', async () => {
    renderPage()
    expect(await screen.findByText('Carlos Dias')).toBeInTheDocument()
    expect(screen.getByText('carlos@test.com')).toBeInTheDocument()
  })

  it('exibe Avatar com src do photoUrl', async () => {
    renderPage()
    await screen.findByText('Carlos Dias')
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', expect.stringContaining('example.com/avatar.jpg'))
  })

  it('DuelingPicklist mostra permissões atribuídas à direita', async () => {
    renderPage()
    await screen.findByText('Carlos Dias')
    const assignedList = screen.getByRole('listbox', { name: /atribuídas/i })
    expect(assignedList).toBeInTheDocument()
    expect(assignedList).toHaveTextContent(/gerenciamento de pedidos/i)
  })

  it('mover permissão via DuelingPicklist e salvar chama PUT /permissions', async () => {
    let captured: unknown = null
    server.use(
      http.put('/api/admin/employees/:id/permissions', async ({ request }) => {
        captured = await request.json()
        return HttpResponse.json({ ...mockEmployee, permissions: ['MANAGE_ORDERS', 'MANAGE_PRODUCTS'] })
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('option', { name: /gerenciamento de produtos/i }))
    await user.click(screen.getByRole('button', { name: '→' }))
    await user.click(screen.getByRole('button', { name: /salvar permissões/i }))

    await screen.findByRole('status')
    expect(captured).toMatchObject({
      permissions: expect.arrayContaining(['MANAGE_ORDERS', 'MANAGE_PRODUCTS']),
    })
  })

  it('exibe toast de sucesso ao salvar permissões', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('button', { name: /salvar permissões/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/permissões salvas/i)
  })

  it('exibe toast de erro quando PUT falha', async () => {
    server.use(
      http.put('/api/admin/employees/:id/permissions', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('button', { name: /salvar permissões/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/erro ao salvar/i)
  })

  it('exibe histórico de ações do funcionário', async () => {
    renderPage()
    await screen.findByText('Carlos Dias')
    expect(await screen.findByText(/UPDATED/i)).toBeInTheDocument()
    expect(screen.getByText(/PRODUCT/i)).toBeInTheDocument()
  })

  it('botão "Redefinir senha" está visível e desabilitado', async () => {
    renderPage()
    await screen.findByText('Carlos Dias')
    const btn = screen.getByRole('button', { name: /redefinir senha/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
  })
})
