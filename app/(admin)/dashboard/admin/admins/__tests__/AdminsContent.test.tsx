import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { AdminsContent } from '../AdminsContent'
import { useAuthStore } from '@/stores/auth.store'
import type { Employee } from '@/types'

const mockAdmins: Employee[] = [
  { id: 'admin-1', name: 'Ana Costa', email: 'ana@test.com', role: 'ADMIN', permissions: [] },
]

const newAdmin: Employee = { id: 'admin-2', name: 'Carlos Melo', email: 'carlos@test.com', role: 'ADMIN', permissions: [] }

let lastDeletedId = ''
let lastListUrl = ''
let deleteResponse: { status: number; body?: Record<string, unknown> } = { status: 204 }

const server = setupServer(
  http.get('/api/admin/admins', ({ request }) => {
    lastListUrl = request.url
    return HttpResponse.json(mockAdmins)
  }),
  http.post('/api/admin/admins', () => HttpResponse.json(newAdmin, { status: 201 })),
  http.delete('/api/admin/admins/:id', ({ params }) => {
    lastDeletedId = params.id as string
    if (deleteResponse.status === 204) return new HttpResponse(null, { status: 204 })
    return HttpResponse.json(deleteResponse.body, { status: deleteResponse.status })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  lastDeletedId = ''
  lastListUrl = ''
  deleteResponse = { status: 204 }
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
    user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' as const },
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
