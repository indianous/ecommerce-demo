import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => '/dashboard/promotions',
  useSearchParams: () => new URLSearchParams(),
}))

import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import { PromotionsContent } from '@/components/content/dashboard/catalog/PromotionsContent'
import { useAuthStore } from '@/stores/auth.store'
import type { EmployeePermission, Promotion } from '@/types'

const blackFriday: Promotion = {
  id: 'promo-1', name: 'Black Friday', type: 'PERCENT', value: 20,
  startDate: '2026-09-20T00:00:00', endDate: '2026-09-30T23:59:00', status: 'ACTIVE', productCount: 12,
}
const natal: Promotion = {
  id: 'promo-2', name: 'Natal', type: 'FIXED_PRICE', value: 49.9,
  startDate: '2026-12-01T00:00:00', endDate: '2026-12-25T23:59:00', status: 'SCHEDULED', productCount: 3,
}

let promotions: Promotion[] = []
let requestedStatuses: (string | null)[] = []
let lastPost: unknown = null
let lastPut: { id: string; body: unknown } | null = null
let endedId = ''
let deletedId = ''

const server = setupServer(
  http.get('/api/admin/promotions', ({ request }) => {
    requestedStatuses.push(new URL(request.url).searchParams.get('status'))
    return HttpResponse.json({ content: promotions, totalPages: 1 })
  }),
  http.post('/api/admin/promotions', async ({ request }) => {
    lastPost = await request.json()
    const created = { ...(lastPost as object), id: 'promo-new', status: 'ACTIVE', productCount: 0 } as Promotion
    promotions = [...promotions, created]
    return HttpResponse.json(created, { status: 201 })
  }),
  http.put('/api/admin/promotions/:id', async ({ request, params }) => {
    lastPut = { id: params.id as string, body: await request.json() }
    return HttpResponse.json({ ...blackFriday, ...(lastPut.body as object) })
  }),
  http.post('/api/admin/promotions/:id/end', ({ params }) => {
    endedId = params.id as string
    return HttpResponse.json({ ...blackFriday, status: 'EXPIRED' })
  }),
  http.delete('/api/admin/promotions/:id', ({ params }) => {
    deletedId = params.id as string
    promotions = promotions.filter((p) => p.id !== deletedId)
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  requestedStatuses = []
  lastPost = null
  lastPut = null
  endedId = ''
  deletedId = ''
  replaceMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

function setEmployee(permissions: EmployeePermission[]) {
  useAuthStore.setState({
    accessToken: 'tok', isAuthenticated: true, role: 'EMPLOYEE',
    user: {
      id: 'u-1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions,
      phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null,
    },
  })
}

beforeEach(() => {
  promotions = [blackFriday, natal]
  setEmployee(['MANAGE_PRODUCTS'])
})

function renderContent() {
  return render(
    <ToastProvider>
      <PromotionsContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

const rowOf = async (name: string) => (await screen.findByRole('link', { name })).closest('tr') as HTMLElement

describe('PromotionsContent — listagem', () => {
  it('abre na aba "Ativas" pedindo status=ACTIVE, com nome (link), desconto, período, produtos e situação', async () => {
    renderContent()

    const row = await rowOf('Black Friday')
    expect(requestedStatuses[0]).toBe('ACTIVE')
    expect(within(row).getByRole('link', { name: 'Black Friday' })).toHaveAttribute('href', '/dashboard/promotions/promo-1')
    expect(within(row).getByText('20%')).toBeInTheDocument()
    expect(within(row).getByText('20/09/2026 00:00')).toBeInTheDocument()
    expect(within(row).getByText('30/09/2026 23:59')).toBeInTheDocument()
    expect(within(row).getByText('12')).toBeInTheDocument()
    expect(within(row).getByText('Ativa')).toBeInTheDocument()
    expect(within(await rowOf('Natal')).getByText(/R\$\s*49,90/)).toBeInTheDocument()
  })

  it.each([
    ['Agendadas', 'SCHEDULED'],
    ['Encerradas', 'EXPIRED'],
    ['Todas', null],
  ])('a aba "%s" pede status=%s', async (tab, status) => {
    const user = userEvent.setup()
    renderContent()
    await rowOf('Black Friday')

    await user.click(screen.getByRole('tab', { name: tab }))

    await waitFor(() => expect(requestedStatuses.at(-1)).toBe(status))
  })

  it('aba sem promoções mostra o estado vazio', async () => {
    promotions = []
    renderContent()

    expect(await screen.findByText(/nenhuma promoção ativa/i)).toBeInTheDocument()
  })

  it('funcionário sem MANAGE_PRODUCTS é redirecionado para /dashboard', async () => {
    setEmployee(['MANAGE_ORDERS'])
    renderContent()

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/dashboard'))
  })
})

describe('PromotionsContent — criar e editar', () => {
  it('"Nova promoção" cria sem produtos pelo POST', async () => {
    const user = userEvent.setup()
    renderContent()
    await rowOf('Black Friday')

    await user.click(screen.getByRole('button', { name: /nova promoção/i }))
    const dialog = screen.getByRole('dialog', { name: /nova promoção/i })
    await user.type(within(dialog).getByLabelText(/^nome/i), 'Dia dos Pais')
    await user.type(within(dialog).getByLabelText(/^início/i), '2026-08-01T00:00')
    await user.type(within(dialog).getByLabelText(/^fim/i), '2026-08-10T23:59')
    await user.click(within(dialog).getByRole('button', { name: /criar promoção/i }))

    await waitFor(() => expect(lastPost).toEqual({
      name: 'Dia dos Pais', type: 'PERCENT', value: 10,
      startDate: '2026-08-01T00:00', endDate: '2026-08-10T23:59', productIds: [],
    }))
    expect(await screen.findByText(/promoção dia dos pais criada/i)).toBeInTheDocument()
  })

  it('editar abre o formulário preenchido e salva pelo PUT', async () => {
    const user = userEvent.setup()
    renderContent()
    const row = await rowOf('Black Friday')

    await user.click(within(row).getByRole('button', { name: /editar black friday/i }))
    const dialog = screen.getByRole('dialog', { name: /editar promoção/i })
    expect(within(dialog).getByLabelText(/^nome/i)).toHaveValue('Black Friday')
    expect(within(dialog).getByRole('radio', { name: /percentual/i })).toBeChecked()
    expect(within(dialog).getByLabelText(/^início/i)).toHaveValue('2026-09-20T00:00')

    await user.click(within(dialog).getByRole('button', { name: /salvar promoção/i }))

    await waitFor(() => expect(lastPut).toEqual({
      id: 'promo-1',
      body: { name: 'Black Friday', type: 'PERCENT', value: 20, startDate: '2026-09-20T00:00', endDate: '2026-09-30T23:59' },
    }))
    expect(await screen.findByText(/promoção atualizada/i)).toBeInTheDocument()
  })

  it('400 ao editar: mostra a mensagem e mantém o formulário aberto', async () => {
    server.use(
      http.put('/api/admin/promotions/:id', () =>
        HttpResponse.json({ message: 'O preço promocional precisa ser menor que o preço normal em: Mouse' }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    renderContent()
    const row = await rowOf('Black Friday')

    await user.click(within(row).getByRole('button', { name: /editar black friday/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /salvar promoção/i }))

    expect(await screen.findByText(/menor que o preço normal em: mouse/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('PromotionsContent — encerrar e excluir', () => {
  it('encerrar só aparece em promoção ativa e pede confirmação', async () => {
    const user = userEvent.setup()
    renderContent()
    const row = await rowOf('Black Friday')

    expect(within(await rowOf('Natal')).queryByRole('button', { name: /encerrar/i })).not.toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: /encerrar black friday/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    await waitFor(() => expect(endedId).toBe('promo-1'))
    expect(await screen.findByText(/promoção encerrada/i)).toBeInTheDocument()
  })

  it('excluir pede confirmação e tira a promoção da lista', async () => {
    const user = userEvent.setup()
    renderContent()
    const row = await rowOf('Natal')

    await user.click(within(row).getByRole('button', { name: /excluir natal/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    await waitFor(() => expect(deletedId).toBe('promo-2'))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Natal' })).not.toBeInTheDocument())
    expect(await screen.findByText(/promoção excluída/i)).toBeInTheDocument()
  })
})
