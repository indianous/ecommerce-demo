import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()
let mockSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: pushMock }),
  usePathname: () => '/dashboard/employees',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

import { ToastProvider, ToastViewport } from 'base-ds'
import { EmployeesContent } from '@/components/content/EmployeesContent'
import { useAuthStore } from '@/stores/auth.store'
import type { Employee } from '@/types'

const mockEmployees: Employee[] = [
  { id: 'emp-1', name: 'Ana Costa', email: 'ana@test.com', role: 'EMPLOYEE', permissions: [] },
]

let lastDeletedId = ''
let lastListUrl = ''
const mockPage = { content: mockEmployees, page: 0, size: 20, totalElements: mockEmployees.length, totalPages: 1, last: true }

const server = setupServer(
  http.get('/api/admin/employees', ({ request }) => {
    lastListUrl = request.url
    return HttpResponse.json(mockPage)
  }),
  http.delete('/api/admin/employees/:id', ({ params }) => {
    lastDeletedId = params.id as string
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  lastDeletedId = ''
  lastListUrl = ''
  pushMock.mockClear()
  mockSearch = ''
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    isAuthenticated: true,
    accessToken: 'mock-token',
    role: 'EMPLOYEE' as const,
    user: {
      id: '1',
      name: 'Func',
      email: 'func@test.com',
      role: 'EMPLOYEE' as const,
      permissions: ['MANAGE_EMPLOYEES' as const],
     phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const},
  })
})

function renderContent() {
  return render(
    <ToastProvider>
      <EmployeesContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('EmployeesContent — exclusão', () => {
  it('clicar em excluir abre o dialog de confirmação com o nome do funcionário', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /excluir ana costa/i }))

    const dialog = screen.getByRole('dialog', { name: /excluir funcionário/i })
    expect(dialog).toHaveTextContent('Ana Costa')
    expect(lastDeletedId).toBe('')
  })

  it('cancelar não chama DELETE', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /excluir ana costa/i }))
    await user.click(screen.getByRole('button', { name: /^cancelar$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(lastDeletedId).toBe('')
  })

  it('confirmar chama DELETE /api/admin/employees/:id e some da lista', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /excluir ana costa/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    expect(lastDeletedId).toBe('emp-1')
    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument()
  })
})

describe('EmployeesContent — listagem', () => {
  it('fetch inicial manda ?role=EMPLOYEE', async () => {
    renderContent()
    await screen.findByText('Ana Costa')

    expect(new URL(lastListUrl).searchParams.get('role')).toBe('EMPLOYEE')
  })

  it('exibe botão "Editar" (não mais "Permissões") ao lado de cada funcionário', async () => {
    renderContent()
    await screen.findByText('Ana Costa')

    expect(screen.getByRole('button', { name: 'Editar Ana Costa' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /permissões de/i })).not.toBeInTheDocument()
  })
})

describe('EmployeesContent — busca', () => {
  it('digitar no campo de busca não dispara nova chamada à API', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')
    const urlBeforeTyping = lastListUrl

    await user.type(screen.getByRole('textbox', { name: 'Buscar funcionários' }), 'Ana')

    expect(lastListUrl).toBe(urlBeforeTyping)
  })

  it('clicar no botão de busca dispara a chamada com ?search= e mantém ?role=EMPLOYEE', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.type(screen.getByRole('textbox', { name: 'Buscar funcionários' }), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    await new Promise((r) => setTimeout(r, 0))
    const params = new URL(lastListUrl).searchParams
    expect(params.get('search')).toBe('Ana')
    expect(params.get('role')).toBe('EMPLOYEE')
  })
})

describe('EmployeesContent — filtro de permissão', () => {
  it('marcar uma permissão e clicar "Aplicar" chama a API com ?permission=', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    const permissionFilterButton = screen
      .getAllByRole('button', { name: /^permiss/i })
      .find((btn) => !btn.closest('table'))!
    await user.click(permissionFilterButton)
    await user.click(screen.getByRole('checkbox', { name: 'Gerenciamento de Pedidos' }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await new Promise((r) => setTimeout(r, 0))
    expect(new URL(lastListUrl).searchParams.getAll('permission')).toEqual(['MANAGE_ORDERS'])
  })

  it('marcar uma permissão sem clicar em "Aplicar" não dispara nova chamada à API', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')
    const urlBeforeFilter = lastListUrl

    const permissionFilterButton = screen
      .getAllByRole('button', { name: /^permiss/i })
      .find((btn) => !btn.closest('table'))!
    await user.click(permissionFilterButton)
    await user.click(screen.getByRole('checkbox', { name: 'Gerenciamento de Pedidos' }))

    expect(lastListUrl).toBe(urlBeforeFilter)
  })
})

describe('EmployeesContent — paginação', () => {
  it('com totalPages<=1, não exibe navegação de página', async () => {
    renderContent()
    await screen.findByText('Ana Costa')
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('URL com ?page=2 carrega a página 2 direto', async () => {
    mockSearch = 'page=2'
    server.use(
      http.get('/api/admin/employees', ({ request }) => {
        lastListUrl = request.url
        return HttpResponse.json({ ...mockPage, page: 1, totalPages: 3, last: false })
      }),
    )
    renderContent()
    await screen.findByText('Ana Costa')

    expect(new URL(lastListUrl).searchParams.get('page')).toBe('1')
  })

  it('clicar em "Next page" atualiza a URL para ?page=2', async () => {
    server.use(
      http.get('/api/admin/employees', () =>
        HttpResponse.json({ ...mockPage, totalPages: 3, last: false }),
      ),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/employees?page=2')
  })
})
