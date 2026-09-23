import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()
let mockSearch = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/dashboard/admin/admins',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

import { ToastProvider, ToastViewport } from 'base-ds'
import { AdminsContent } from '@/components/content/dashboard/people/AdminsContent'
import { useAuthStore } from '@/stores/auth.store'
import type { Employee } from '@/types'

const mockAdmins: Employee[] = [
  { id: 'admin-1', name: 'Ana Costa', email: 'ana@test.com', role: 'ADMIN', permissions: [] },
  { id: 'admin-2', name: 'Bruno Lima', email: 'bruno@test.com', role: 'ADMIN', permissions: [] },
]

const newAdmin: Employee = { id: 'admin-3', name: 'Carlos Melo', email: 'carlos@test.com', role: 'ADMIN', permissions: [] }

let lastDeletedId = ''
let lastListUrl = ''
let deleteResponse: { status: number; body?: Record<string, unknown> } = { status: 204 }
let lastBulkDeleteBody: { ids: string[] } | null = null
const mockPage = { content: mockAdmins, page: 0, size: 20, totalElements: mockAdmins.length, totalPages: 1, last: true }

const server = setupServer(
  http.get('/api/admin/admins', ({ request }) => {
    lastListUrl = request.url
    return HttpResponse.json(mockPage)
  }),
  http.post('/api/admin/admins', () => HttpResponse.json(newAdmin, { status: 201 })),
  http.delete('/api/admin/admins/:id', ({ params }) => {
    lastDeletedId = params.id as string
    if (deleteResponse.status === 204) return new HttpResponse(null, { status: 204 })
    return HttpResponse.json(deleteResponse.body, { status: deleteResponse.status })
  }),
  http.post('/api/admin/admins/bulk-delete', async ({ request }) => {
    lastBulkDeleteBody = (await request.json()) as { ids: string[] }
    return HttpResponse.json({ successCount: lastBulkDeleteBody.ids.length, failures: [] })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  lastDeletedId = ''
  lastListUrl = ''
  deleteResponse = { status: 204 }
  lastBulkDeleteBody = null
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
    role: 'ADMIN' as const,
    user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' as const , permissions: [], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
  })
})

function renderContent() {
  return render(
    <ToastProvider>
      <AdminsContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('AdminsContent — listagem', () => {
  it('renderiza heading e tabela de administradores vinda da API', async () => {
    renderContent()
    expect(screen.getByRole('heading', { name: 'Gestão de Administradores' })).toBeInTheDocument()
    expect(await screen.findByText('Ana Costa')).toBeInTheDocument()
  })

  it('não exibe botão de gerenciar permissões (só admins têm acesso irrestrito)', async () => {
    renderContent()
    await screen.findByText('Ana Costa')
    expect(screen.queryByRole('button', { name: /editar ana costa/i })).not.toBeInTheDocument()
  })
})

describe('AdminsContent — busca', () => {
  it('digitar no campo de busca não dispara nova chamada à API', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')
    const urlBeforeTyping = lastListUrl

    await user.type(screen.getByRole('textbox', { name: 'Buscar administradores' }), 'Ana')

    expect(lastListUrl).toBe(urlBeforeTyping)
  })

  it('clicar no botão de busca dispara a chamada com ?search=', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.type(screen.getByRole('textbox', { name: 'Buscar administradores' }), 'Ana')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    await new Promise((r) => setTimeout(r, 0))
    expect(new URL(lastListUrl).searchParams.get('search')).toBe('Ana')
  })
})

describe('AdminsContent — criar administrador', () => {
  it('botão "Novo administrador" abre dialog com EmployeeForm (nome/e-mail/senha)', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: 'Novo administrador' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo administrador' })

    expect(within(dialog).getByLabelText(/nome/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('submissão do form chama POST /api/admin/admins e adiciona à lista', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: 'Novo administrador' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo administrador' })

    await user.type(within(dialog).getByLabelText(/nome/i), 'Carlos Melo')
    await user.type(within(dialog).getByLabelText(/e-mail/i), 'carlos@test.com')
    await user.type(within(dialog).getByLabelText(/senha/i), 'senhaSegura1')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Carlos Melo')).toBeInTheDocument()
  })
})

describe('AdminsContent — exclusão', () => {
  it('confirmar exclusão chama DELETE /api/admin/admins/:id e remove da lista', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /excluir ana costa/i }))
    expect(screen.getByRole('dialog', { name: /excluir administrador/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    expect(lastDeletedId).toBe('admin-1')
    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument()
  })

  it('excluir o último admin: erro 400 do backend vira toast, sem quebrar a tela', async () => {
    deleteResponse = { status: 400, body: { status: 400, message: 'Não é possível excluir o último administrador do sistema' } }
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /excluir ana costa/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    expect(await screen.findByText(/não é possível excluir o último administrador/i)).toBeInTheDocument()
    expect(screen.getByText('Ana Costa')).toBeInTheDocument()
  })
})

describe('AdminsContent — paginação', () => {
  it('com totalPages<=1, não exibe navegação de página', async () => {
    renderContent()
    await screen.findByText('Ana Costa')
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument()
  })

  it('URL com ?page=2 carrega a página 2 direto', async () => {
    mockSearch = 'page=2'
    server.use(
      http.get('/api/admin/admins', ({ request }) => {
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
      http.get('/api/admin/admins', () =>
        HttpResponse.json({ ...mockPage, totalPages: 3, last: false }),
      ),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/admin/admins?page=2')
  })
})

describe('AdminsContent — seleção em massa', () => {
  it('confirmar exclusão em massa chama o bulk-delete e remove os selecionados da lista', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('checkbox', { name: /selecionar ana costa/i }))
    await user.click(screen.getByRole('checkbox', { name: /selecionar bruno lima/i }))
    await user.click(screen.getByRole('button', { name: /excluir selecionados/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    expect(lastBulkDeleteBody?.ids.sort()).toEqual(['admin-1', 'admin-2'])
    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument()
    expect(screen.queryByText('Bruno Lima')).not.toBeInTheDocument()
  })

  it('lote incluindo o último admin: sucesso parcial mantém o que falhou e mostra o motivo', async () => {
    server.use(
      http.post('/api/admin/admins/bulk-delete', () =>
        HttpResponse.json({
          successCount: 1,
          failures: [{ id: 'admin-2', reason: 'Não é possível excluir o último administrador do sistema' }],
        }),
      ),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('checkbox', { name: /selecionar ana costa/i }))
    await user.click(screen.getByRole('checkbox', { name: /selecionar bruno lima/i }))
    await user.click(screen.getByRole('button', { name: /excluir selecionados/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument()
    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument()
    expect(await screen.findByText(/último administrador/i)).toBeInTheDocument()
  })
})
