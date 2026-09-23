import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

import { ToastProvider, ToastViewport } from 'base-ds'
import { CategoriesContent } from '@/components/content/dashboard/catalog/CategoriesContent'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminCategory, EmployeePermission } from '@/types'

const roupas: AdminCategory = { id: 'c-1', name: 'Roupas', slug: 'roupas', description: 'Moda em geral', productCount: 2 }
const brinquedos: AdminCategory = { id: 'c-2', name: 'Brinquedos', slug: 'brinquedos', productCount: 0 }

let categories: AdminCategory[] = []
let lastPostBody: Record<string, unknown> | null = null
let lastPutBody: Record<string, unknown> | null = null
let lastPutId = ''
let lastDeletedId = ''

const server = setupServer(
  http.get('/api/admin/categories', () => HttpResponse.json(categories)),
  http.post('/api/admin/categories', async ({ request }) => {
    lastPostBody = (await request.json()) as Record<string, unknown>
    const created = { id: 'c-new', slug: 'gerado', description: null, ...lastPostBody, productCount: 0 }
    categories = [...categories, created as AdminCategory]
    return HttpResponse.json(created, { status: 201 })
  }),
  http.put('/api/admin/categories/:id', async ({ request, params }) => {
    lastPutId = params.id as string
    lastPutBody = (await request.json()) as Record<string, unknown>
    categories = categories.map((c) => (c.id === lastPutId ? { ...c, ...(lastPutBody as object) } : c))
    return HttpResponse.json({ id: lastPutId, ...lastPutBody })
  }),
  http.delete('/api/admin/categories/:id', ({ params }) => {
    lastDeletedId = params.id as string
    categories = categories.filter((c) => c.id !== lastDeletedId)
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  lastPostBody = null
  lastPutBody = null
  lastPutId = ''
  lastDeletedId = ''
  replaceMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

function setEmployee(permissions: EmployeePermission[]) {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    role: 'EMPLOYEE',
    user: {
      id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions,
      phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null,
    },
  })
}

beforeEach(() => {
  categories = [brinquedos, roupas]
  setEmployee(['MANAGE_PRODUCTS'])
})

function renderContent() {
  return render(
    <ToastProvider>
      <CategoriesContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('CategoriesContent — listagem', () => {
  it('lista as categorias com nome, slug e quantidade de produtos', async () => {
    renderContent()

    const row = (await screen.findByText('Roupas')).closest('tr') as HTMLElement
    expect(within(row).getByText('roupas')).toBeInTheDocument()
    expect(within(row).getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Brinquedos')).toBeInTheDocument()
  })

  it('sem categorias, mostra o estado vazio', async () => {
    categories = []
    renderContent()

    expect(await screen.findByText(/nenhuma categoria cadastrada/i)).toBeInTheDocument()
  })

  it('funcionário sem MANAGE_PRODUCTS é redirecionado para /dashboard', async () => {
    setEmployee(['MANAGE_ORDERS'])
    renderContent()

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/dashboard'))
  })
})

describe('CategoriesContent — criar', () => {
  it('"Nova categoria" abre o diálogo e salvar sem slug faz POST só com nome e descrição', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Roupas')

    await user.click(screen.getByRole('button', { name: /nova categoria/i }))
    const dialog = screen.getByRole('dialog', { name: /nova categoria/i })
    await user.type(within(dialog).getByLabelText(/^nome/i), 'Eletrônicos')
    await user.type(within(dialog).getByLabelText(/descrição/i), 'Tecnologia')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(lastPostBody).toEqual({ name: 'Eletrônicos', description: 'Tecnologia' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText(/categoria criada/i)).toBeInTheDocument()
    expect(await screen.findByText('Eletrônicos')).toBeInTheDocument()
  })

  it('com slug preenchido, envia o slug', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Roupas')

    await user.click(screen.getByRole('button', { name: /nova categoria/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^nome/i), 'Eletrônicos')
    await user.type(within(dialog).getByLabelText(/^slug/i), 'eletronicos')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(lastPostBody).toMatchObject({ name: 'Eletrônicos', slug: 'eletronicos' }))
  })

  it('"Salvar" fica desabilitado sem nome', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Roupas')

    await user.click(screen.getByRole('button', { name: /nova categoria/i }))
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('409 (slug repetido): mostra a mensagem do backend e mantém o diálogo aberto', async () => {
    server.use(
      http.post('/api/admin/categories', () =>
        HttpResponse.json({ message: 'Já existe uma categoria com o slug "roupas".' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Brinquedos')

    await user.click(screen.getByRole('button', { name: /nova categoria/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^nome/i), 'Roupas')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText(/já existe uma categoria com o slug "roupas"/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('CategoriesContent — editar', () => {
  it('abre o diálogo com os campos preenchidos e salvar faz PUT', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Roupas')

    await user.click(screen.getByRole('button', { name: /editar roupas/i }))
    const dialog = screen.getByRole('dialog', { name: /editar categoria/i })
    const name = within(dialog).getByLabelText(/^nome/i)
    expect(name).toHaveValue('Roupas')
    expect(within(dialog).getByLabelText(/^slug/i)).toHaveValue('roupas')
    expect(within(dialog).getByLabelText(/descrição/i)).toHaveValue('Moda em geral')

    await user.clear(name)
    await user.type(name, 'Moda')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(lastPutId).toBe('c-1'))
    expect(lastPutBody).toEqual({ name: 'Moda', slug: 'roupas', description: 'Moda em geral' })
    expect(await screen.findByText(/categoria atualizada/i)).toBeInTheDocument()
    expect(await screen.findByText('Moda')).toBeInTheDocument()
  })

  it('a dica do slug avisa que trocar o slug quebra links já compartilhados', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Roupas')

    await user.click(screen.getByRole('button', { name: /editar roupas/i }))

    expect(within(screen.getByRole('dialog')).getByText(/links já compartilhados/i)).toBeInTheDocument()
  })
})

describe('CategoriesContent — excluir', () => {
  it('categoria sem produtos: confirma e ela sai da lista', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Brinquedos')

    await user.click(screen.getByRole('button', { name: /^excluir brinquedos$/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    await waitFor(() => expect(lastDeletedId).toBe('c-2'))
    await waitFor(() => expect(screen.queryByText('Brinquedos')).not.toBeInTheDocument())
    expect(await screen.findByText(/categoria excluída/i)).toBeInTheDocument()
  })

  it('categoria com produtos: o botão de excluir fica desabilitado e explica o motivo', async () => {
    renderContent()
    await screen.findByText('Roupas')

    const button = screen.getByRole('button', { name: /não é possível excluir roupas: em uso por 2 produtos/i })
    expect(button).toBeDisabled()
  })

  it('409 do backend ao excluir: mostra a mensagem e mantém a categoria', async () => {
    server.use(
      http.delete('/api/admin/categories/:id', () =>
        HttpResponse.json({ message: 'Categoria em uso por 1 produto(s).' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Brinquedos')

    await user.click(screen.getByRole('button', { name: /^excluir brinquedos$/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    expect(await screen.findByText(/categoria em uso por 1 produto/i)).toBeInTheDocument()
    expect(screen.getByText('Brinquedos')).toBeInTheDocument()
  })
})
