import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import { EmployeeFuncionarioDetailContent } from '@/components/content/dashboard/people/EmployeeFuncionarioDetailContent'
import { useAuthStore } from '@/stores/auth.store'
import type { AuditLogPage, EmployeeDetailResponse, EmployeePermission } from '@/types'

const mockEmployee: EmployeeDetailResponse = {
  id: 'emp-1',
  name: 'Carlos Dias',
  email: 'carlos@test.com',
  role: 'EMPLOYEE',
  permissions: ['MANAGE_ORDERS'],
  createdAt: '2024-01-01T00:00:00Z',
  photoUrl: 'https://example.com/avatar.jpg',
  passwordSet: true,
  emailVerified: true, mfaEnabled: true, primaryAdmin: false,
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
  page: 0,
  last: true,
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
      // plano 71: o TransferList só oferece o que o ator tem
      permissions: ['MANAGE_EMPLOYEES', 'MANAGE_ORDERS', 'MANAGE_PRODUCTS'],
     phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
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

  it('exibe botão de copiar ao lado do nome e do e-mail', async () => {
    renderDetail()
    await screen.findByText('Carlos Dias')
    expect(screen.getByRole('button', { name: 'Copiar nome' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar e-mail' })).toBeInTheDocument()
  })

  it('exibe Avatar com src do photoUrl', async () => {
    renderDetail()
    await screen.findByText('Carlos Dias')
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', expect.stringContaining('example.com/avatar.jpg'))
  })

  it('TransferList mostra permissões atribuídas à direita', async () => {
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
    await user.click(screen.getByRole('button', { name: /mover para atribuídas/i }))
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
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
    })
    await act(async () => {
      render(<ToastProvider><EmployeeFuncionarioDetailContent id="emp-1" /></ToastProvider>)
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})

describe('EmployeeFuncionarioDetailContent — conta (plano 64)', () => {
  it('MANAGE_EMPLOYEES vendo funcionário sem senha → Badge e "Enviar convite"', async () => {
    server.use(http.get('/api/admin/employees/:id', () =>
      HttpResponse.json({ ...mockEmployee, passwordSet: false, emailVerified: false, mfaEnabled: true })))
    renderDetail()

    expect(await screen.findByText('Senha não definida')).toBeInTheDocument()
    expect(screen.getByText('E-mail não confirmado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar convite' })).toBeInTheDocument()
  })

  it('MANAGE_EMPLOYEES vendo um admin → sem botão (admin só por admin)', async () => {
    server.use(http.get('/api/admin/employees/:id', () =>
      HttpResponse.json({ ...mockEmployee, role: 'ADMIN', passwordSet: true, emailVerified: true, mfaEnabled: true })))
    renderDetail()

    await screen.findByText('Carlos Dias')
    expect(screen.queryByRole('button', { name: /enviar (convite|link)/i })).not.toBeInTheDocument()
  })
})

describe('EmployeeFuncionarioDetailContent — 2FA (plano 65)', () => {
  it('MANAGE_EMPLOYEES vê o estado do 2FA, mas não reseta (só admin reseta a equipe)', async () => {
    server.use(http.get('/api/admin/employees/:id', () =>
      HttpResponse.json({ ...mockEmployee, mfaEnabled: false })))
    renderDetail()

    expect(await screen.findByText('2FA pendente')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resetar 2FA' })).not.toBeInTheDocument()
  })
})

describe('EmployeeFuncionarioDetailContent — sem autoconcessão (plano 71)', () => {
  const colegaComSite: EmployeeDetailResponse = { ...mockEmployee, permissions: ['MANAGE_ORDERS', 'MANAGE_SITE'] }

  function loginAs(permissions: EmployeePermission[], id = 'manager-1') {
    useAuthStore.setState({
      user: {
        id, name: 'Manager', email: 'manager@test.com', role: 'EMPLOYEE', permissions,
        phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null,
      },
    })
  }

  it('no próprio perfil: sem TransferList e sem salvar, com as permissões só para leitura e o aviso', async () => {
    loginAs(['MANAGE_EMPLOYEES', 'MANAGE_ORDERS'], 'emp-1')
    renderDetail('emp-1')
    await screen.findByText('Carlos Dias')

    expect(screen.queryByRole('listbox', { name: /atribuídas/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /salvar permissões/i })).not.toBeInTheDocument()
    expect(screen.getByText(/você não pode alterar as próprias permissões/i)).toBeInTheDocument()
    expect(screen.getByText('Gerenciamento de Pedidos')).toBeInTheDocument()
  })

  it('num colega: o TransferList só oferece o que o ator tem, e o resto aparece em "Outras permissões"', async () => {
    loginAs(['MANAGE_EMPLOYEES', 'MANAGE_ORDERS'])
    server.use(http.get('/api/admin/employees/:id', () => HttpResponse.json(colegaComSite)))
    renderDetail()
    await screen.findByText('Carlos Dias')

    expect(screen.getByRole('listbox', { name: /atribuídas/i })).toHaveTextContent('Gerenciamento de Pedidos')
    expect(screen.getByRole('listbox', { name: /disponíveis/i })).toHaveTextContent('Gestão de Funcionários')
    expect(screen.queryByRole('option', { name: /gestão do site/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /gerenciamento de produtos/i })).not.toBeInTheDocument()
    const outras = screen.getByRole('region', { name: /outras permissões/i })
    expect(outras).toHaveTextContent('Gestão do Site')
  })

  it('salvar num colega leva junto as "Outras permissões"', async () => {
    let captured: { permissions: string[] } | null = null
    loginAs(['MANAGE_EMPLOYEES', 'MANAGE_ORDERS'])
    server.use(
      http.get('/api/admin/employees/:id', () => HttpResponse.json(colegaComSite)),
      http.put('/api/admin/employees/:id/permissions', async ({ request }) => {
        captured = (await request.json()) as { permissions: string[] }
        return HttpResponse.json({ permissions: captured.permissions })
      }),
    )
    const user = userEvent.setup()
    renderDetail()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('option', { name: /gerenciamento de pedidos/i }))
    await user.click(screen.getByRole('button', { name: /mover para disponíveis/i }))
    await user.click(screen.getByRole('button', { name: /salvar permissões/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/permissões salvas/i)
    expect(captured!.permissions).toEqual(['MANAGE_SITE'])
  })

  it('recusa do backend: o toast mostra a mensagem que veio dele', async () => {
    server.use(
      http.put('/api/admin/employees/:id/permissions', () =>
        HttpResponse.json(
          { status: 403, message: 'Você só pode conceder ou remover permissões que você tem. Fora do seu alcance: MANAGE_SITE' },
          { status: 403 },
        ),
      ),
    )
    const user = userEvent.setup()
    renderDetail()
    await screen.findByText('Carlos Dias')

    await user.click(screen.getByRole('button', { name: /salvar permissões/i }))

    expect(await screen.findByText(/fora do seu alcance: MANAGE_SITE/i)).toBeInTheDocument()
  })
})
