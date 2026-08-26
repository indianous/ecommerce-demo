import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

import { ToastProvider, ToastViewport } from 'base-ds'
import { NavigationContent } from '@/components/content/NavigationContent'
import { useAuthStore } from '@/stores/auth.store'
import type { SiteNavItem } from '@/types'

const collection: SiteNavItem = {
  id: 'col-1',
  type: 'COLLECTION',
  label: 'Institucional',
  placement: 'NAVBAR',
  position: 0,
  children: [
    { id: 'child-1', type: 'LINK', label: 'Sobre nós', url: 'https://loja.com/about-us', placement: null, position: 0, children: [] },
    { id: 'child-2', type: 'LINK', label: 'Trabalhe conosco', url: 'https://loja.com/jobs', placement: null, position: 1, children: [] },
  ],
}

const directLink: SiteNavItem = {
  id: 'link-1',
  type: 'LINK',
  label: 'Contato',
  url: 'https://loja.com/contact',
  placement: 'FOOTER',
  position: 1,
  children: [],
}

let tree: SiteNavItem[] = []
let lastOrderBody: unknown = null
let lastChildrenOrderBody: unknown = null
let lastChildrenOrderId = ''
let lastDeletedId = ''

const server = setupServer(
  http.get('/api/admin/site/nav-items', () => HttpResponse.json(tree)),
  http.post('/api/admin/site/nav-items', () => HttpResponse.json({ id: 'new-1' }, { status: 201 })),
  http.put('/api/admin/site/nav-items/:id', () => HttpResponse.json({ id: 'edited-1' })),
  http.delete('/api/admin/site/nav-items/:id', ({ params }) => {
    lastDeletedId = params.id as string
    return new HttpResponse(null, { status: 204 })
  }),
  http.patch('/api/admin/site/nav-items/order', async ({ request }) => {
    lastOrderBody = await request.json()
    return HttpResponse.json(tree)
  }),
  http.patch('/api/admin/site/nav-items/:id/children-order', async ({ request, params }) => {
    lastChildrenOrderId = params.id as string
    lastChildrenOrderBody = await request.json()
    return HttpResponse.json(tree)
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  lastOrderBody = null
  lastChildrenOrderBody = null
  lastChildrenOrderId = ''
  lastDeletedId = ''
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  tree = [collection, directLink]
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_SITE'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
  })
})

function renderPage() {
  return render(
    <ToastProvider>
      <NavigationContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('NavigationContent — listagem', () => {
  it('lista itens de topo (coleções e links diretos) na ordem atual', async () => {
    renderPage()

    expect(await screen.findByText('Institucional')).toBeInTheDocument()
    expect(screen.getByText('Contato')).toBeInTheDocument()
  })

  it('botão "Nova coleção" abre Dialog com NavItemForm', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Institucional')

    await user.click(screen.getByRole('button', { name: /nova coleção/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText(/label/i)).toBeInTheDocument()
  })

  it('botão "Novo link" abre Dialog com NavItemForm', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Institucional')

    await user.click(screen.getByRole('button', { name: /novo link/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText(/label/i)).toBeInTheDocument()
  })
})

describe('NavigationContent — coleção expandida', () => {
  it('mostra os links filhos com opção de editar/remover/adicionar', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Institucional')

    await user.click(screen.getByRole('button', { name: /expandir/i }))

    expect(screen.getByText('Sobre nós')).toBeInTheDocument()
    expect(screen.getByText('Trabalhe conosco')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /editar sobre nós/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remover sobre nós/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /novo link em institucional/i })).toBeInTheDocument()
  })
})

describe('NavigationContent — reordenar', () => {
  it('descer um item de topo chama o endpoint de reorder de topo', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Institucional')

    await user.click(screen.getByRole('button', { name: /descer institucional/i }))

    await waitFor(() => {
      expect(lastOrderBody).toEqual({ orderedIds: ['link-1', 'col-1'] })
    })
  })

  it('descer um filho chama o endpoint de reorder de filhos daquela coleção', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Institucional')
    await user.click(screen.getByRole('button', { name: /expandir/i }))

    await user.click(screen.getByRole('button', { name: /descer sobre nós/i }))

    await waitFor(() => {
      expect(lastChildrenOrderId).toBe('col-1')
      expect(lastChildrenOrderBody).toEqual({ orderedIds: ['child-2', 'child-1'] })
    })
  })
})

describe('NavigationContent — remoção', () => {
  it('remover uma coleção com filhos mostra confirmação antes de excluir', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Institucional')

    await user.click(screen.getByRole('button', { name: /remover institucional/i }))

    expect(screen.getByRole('dialog', { name: /remover coleção/i })).toBeInTheDocument()
    expect(lastDeletedId).toBe('')

    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    await waitFor(() => {
      expect(lastDeletedId).toBe('col-1')
    })
  })

  it('remover um link direto (sem filhos) também mostra confirmação antes de excluir', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Contato')

    await user.click(screen.getByRole('button', { name: /remover contato/i }))

    expect(screen.getByRole('dialog', { name: /remover item/i })).toBeInTheDocument()
    expect(lastDeletedId).toBe('')

    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    await waitFor(() => {
      expect(lastDeletedId).toBe('link-1')
    })
  })

  it('cancelar a confirmação não exclui o item', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Contato')

    await user.click(screen.getByRole('button', { name: /remover contato/i }))
    await user.click(screen.getByRole('button', { name: /^cancelar$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(lastDeletedId).toBe('')
  })
})

describe('NavigationContent — controle de acesso', () => {
  it('sem MANAGE_SITE, a página inteira não renderiza', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'] , phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
    })
    await act(async () => {
      render(
        <ToastProvider>
          <NavigationContent />
        </ToastProvider>,
      )
    })

    expect(screen.queryByText('Institucional')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /navegação do site/i })).not.toBeInTheDocument()
  })
})
