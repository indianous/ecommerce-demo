import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

import { ToastProvider, ToastViewport } from 'base-ds'
import { DistributionCentersContent } from '@/components/content/DistributionCentersContent'
import { useAuthStore } from '@/stores/auth.store'
import type { DistributionCenter } from '@/types'

const centerA: DistributionCenter = {
  id: 'dc-1', name: 'CD Zona Sul', phone: '1130001000', street: 'Av. das Nações',
  number: '1000', district: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01310100', active: true,
}
const centerB: DistributionCenter = {
  id: 'dc-2', name: 'CD Zona Norte', street: 'Rua X', number: '50',
  district: 'Bairro', city: 'São Paulo', state: 'SP', zipCode: '02000000', active: true,
}

let centers: DistributionCenter[] = []
let lastPostBody: unknown = null
let lastPutBody: unknown = null
let lastDeletedId = ''

const server = setupServer(
  http.get('/api/site/distribution-centers', () => HttpResponse.json(centers)),
  http.post('/api/site/distribution-centers', async ({ request }) => {
    lastPostBody = await request.json()
    return HttpResponse.json({ id: 'new-1', ...(lastPostBody as object), active: true }, { status: 201 })
  }),
  http.put('/api/site/distribution-centers/:id', async ({ request }) => {
    lastPutBody = await request.json()
    return HttpResponse.json({ id: 'dc-1', ...(lastPutBody as object), active: true })
  }),
  http.delete('/api/site/distribution-centers/:id', ({ params }) => {
    lastDeletedId = params.id as string
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  lastPostBody = null
  lastPutBody = null
  lastDeletedId = ''
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  centers = [centerA, centerB]
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_SITE'], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null },
  })
})

function renderPage() {
  return render(
    <ToastProvider>
      <DistributionCentersContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('DistributionCentersContent — listagem', () => {
  it('lista os centros cadastrados', async () => {
    renderPage()

    expect(await screen.findByText('CD Zona Sul')).toBeInTheDocument()
    expect(screen.getByText('CD Zona Norte')).toBeInTheDocument()
  })

  it('sem centros cadastrados, mostra mensagem de lista vazia', async () => {
    centers = []
    renderPage()

    expect(await screen.findByText(/nenhum centro de distribuição cadastrado/i)).toBeInTheDocument()
  })
})

describe('DistributionCentersContent — criar', () => {
  it('botão "Novo centro de distribuição" abre Dialog com o formulário', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('CD Zona Sul')

    await user.click(screen.getByRole('button', { name: /novo centro de distribuição/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText(/^nome$/i)).toBeInTheDocument()
  })

  it('preencher e submeter cria um novo centro, enviando os campos esperados', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('CD Zona Sul')

    await user.click(screen.getByRole('button', { name: /novo centro de distribuição/i }))
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText(/^nome$/i), 'CD Centro')
    await user.type(within(dialog).getByLabelText(/rua\/logradouro/i), 'Rua Nova')
    await user.type(within(dialog).getByLabelText(/número/i), '10')
    await user.type(within(dialog).getByLabelText(/bairro/i), 'Bairro Novo')
    await user.type(within(dialog).getByLabelText(/cidade/i), 'São Paulo')
    await user.type(within(dialog).getByLabelText(/estado/i), 'SP')
    await user.type(within(dialog).getByLabelText(/cep/i), '01000000')

    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(lastPostBody).toMatchObject({ name: 'CD Centro', street: 'Rua Nova', city: 'São Paulo', state: 'SP' })
    })
  })
})

describe('DistributionCentersContent — editar', () => {
  it('botão editar abre Dialog pré-preenchido e submeter chama PUT', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('CD Zona Sul')

    await user.click(screen.getByRole('button', { name: /editar cd zona sul/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText(/^nome$/i)).toHaveValue('CD Zona Sul')

    await user.clear(within(dialog).getByLabelText(/^nome$/i))
    await user.type(within(dialog).getByLabelText(/^nome$/i), 'CD Zona Sul Renomeado')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(lastPutBody).toMatchObject({ name: 'CD Zona Sul Renomeado' })
    })
  })
})

describe('DistributionCentersContent — remoção', () => {
  it('excluir um centro pede confirmação e depois some da lista', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('CD Zona Sul')

    await user.click(screen.getByRole('button', { name: /remover cd zona sul/i }))
    expect(screen.getByRole('dialog', { name: /remover centro de distribuição/i })).toBeInTheDocument()
    expect(lastDeletedId).toBe('')

    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    await waitFor(() => {
      expect(lastDeletedId).toBe('dc-1')
    })
    expect(screen.queryByText('CD Zona Sul')).not.toBeInTheDocument()
  })
})

describe('DistributionCentersContent — controle de acesso', () => {
  it('sem MANAGE_SITE, a página inteira não renderiza', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null },
    })
    await act(async () => {
      render(
        <ToastProvider>
          <DistributionCentersContent />
        </ToastProvider>,
      )
    })

    expect(screen.queryByText('CD Zona Sul')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /centros de distribuição/i })).not.toBeInTheDocument()
  })
})
