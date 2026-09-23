import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => '/dashboard/coupons',
  useSearchParams: () => new URLSearchParams(),
}))

import { ToastProvider, ToastViewport } from 'base-ds'
import { CouponsContent } from '@/components/content/dashboard/sales/CouponsContent'
import { useAuthStore } from '@/stores/auth.store'
import type { Coupon, EmployeePermission } from '@/types'

const natal: Coupon = {
  id: 'cup-1', code: 'NATAL10', type: 'PERCENT', value: 10, maxDiscountAmount: null, minSubtotal: null,
  startsAt: '2026-12-01T00:00:00', endsAt: '2026-12-25T23:59:00', maxUses: 100, maxUsesPerCustomer: 1,
  active: true, usesCount: 3, status: 'ACTIVE',
}
const fixo: Coupon = {
  id: 'cup-2', code: 'FIXO20', type: 'FIXED', value: 20, maxDiscountAmount: null, minSubtotal: 100,
  startsAt: null, endsAt: null, maxUses: null, maxUsesPerCustomer: null,
  active: true, usesCount: 0, status: 'ACTIVE',
}

let coupons: Coupon[] = []
let lastPost: unknown = null
let lastPut: unknown = null
let lastPatch: { id: string; body: unknown } | null = null
let deletedId = ''

const server = setupServer(
  http.get('/api/admin/coupons', () => HttpResponse.json({ content: coupons, totalPages: 1 })),
  http.post('/api/admin/coupons', async ({ request }) => {
    lastPost = await request.json()
    const created = { ...natal, ...(lastPost as object), id: 'cup-new', usesCount: 0 }
    coupons = [...coupons, created as Coupon]
    return HttpResponse.json(created, { status: 201 })
  }),
  http.put('/api/admin/coupons/:id', async ({ request }) => {
    lastPut = await request.json()
    return HttpResponse.json({ ...natal, ...(lastPut as object) })
  }),
  http.patch('/api/admin/coupons/:id/active', async ({ request, params }) => {
    lastPatch = { id: params.id as string, body: await request.json() }
    return HttpResponse.json({ ...natal, active: false, status: 'INACTIVE' })
  }),
  http.delete('/api/admin/coupons/:id', ({ params }) => {
    deletedId = params.id as string
    coupons = coupons.filter((c) => c.id !== deletedId)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/api/admin/coupons/:id/redemptions', () =>
    HttpResponse.json({
      content: [
        { orderId: 'ord-1', orderNumber: 42, customerName: 'Ana', discountAmount: 12.5, redeemedAt: '2026-12-02T10:00:00', releasedAt: null },
        { orderId: 'ord-2', orderNumber: 43, customerName: 'Bia', discountAmount: 8, redeemedAt: '2026-12-03T10:00:00', releasedAt: '2026-12-04T09:00:00' },
      ],
      totalPages: 1,
    }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  lastPost = null
  lastPut = null
  lastPatch = null
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
  coupons = [natal, fixo]
  setEmployee(['MANAGE_COUPONS'])
})

function renderContent() {
  return render(
    <ToastProvider>
      <CouponsContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

const rowOf = async (code: string) => (await screen.findByText(code)).closest('tr') as HTMLElement

describe('CouponsContent — listagem', () => {
  it('mostra código, desconto, validade, usos e situação', async () => {
    renderContent()

    const row = await rowOf('NATAL10')
    expect(within(row).getByText('10%')).toBeInTheDocument()
    expect(within(row).getByText('01/12/2026 00:00 a 25/12/2026 23:59')).toBeInTheDocument()
    expect(within(row).getByText('3 / 100')).toBeInTheDocument()
    expect(within(row).getByText('Ativo')).toBeInTheDocument()

    const fixed = await rowOf('FIXO20')
    expect(within(fixed).getByText(/R\$\s*20,00/)).toBeInTheDocument()
    expect(within(fixed).getByText('Sem validade')).toBeInTheDocument()
    expect(within(fixed).getByText('0 / ∞')).toBeInTheDocument()
  })

  it('sem MANAGE_COUPONS → replace("/dashboard")', async () => {
    setEmployee(['MANAGE_ORDERS'])
    renderContent()

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/dashboard'))
  })
})

describe('CouponsContent — criar, editar, ativar e excluir', () => {
  it('"Novo cupom" cria pelo POST', async () => {
    const user = userEvent.setup()
    renderContent()
    await rowOf('NATAL10')

    await user.click(screen.getByRole('button', { name: /novo cupom/i }))
    const dialog = screen.getByRole('dialog', { name: /novo cupom/i })
    await user.type(within(dialog).getByLabelText(/^código/i), 'pascoa5')
    await user.click(within(dialog).getByRole('button', { name: /salvar cupom/i }))

    await waitFor(() => expect(lastPost).toMatchObject({ code: 'PASCOA5', type: 'PERCENT', active: true }))
    expect(await screen.findByText(/cupom pascoa5 criado/i)).toBeInTheDocument()
  })

  it('409 (código repetido): mostra a mensagem e mantém o diálogo aberto', async () => {
    server.use(http.post('/api/admin/coupons', () =>
      HttpResponse.json({ message: 'Já existe um cupom com o código NATAL10.' }, { status: 409 })))
    const user = userEvent.setup()
    renderContent()
    await rowOf('NATAL10')

    await user.click(screen.getByRole('button', { name: /novo cupom/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^código/i), 'natal10')
    await user.click(within(dialog).getByRole('button', { name: /salvar cupom/i }))

    expect(await screen.findByText(/já existe um cupom com o código natal10/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('editar um cupom já usado trava tipo e valor e salva pelo PUT', async () => {
    const user = userEvent.setup()
    renderContent()
    const row = await rowOf('NATAL10')

    await user.click(within(row).getByRole('button', { name: /editar natal10/i }))
    const dialog = screen.getByRole('dialog', { name: /editar cupom/i })
    expect(within(dialog).getByLabelText(/^código/i)).toHaveValue('NATAL10')
    expect(within(dialog).getByRole('radio', { name: /percentual/i })).toBeDisabled()
    await user.click(within(dialog).getByRole('button', { name: /salvar cupom/i }))

    await waitFor(() => expect(lastPut).toMatchObject({ code: 'NATAL10', value: 10, maxUses: 100 }))
    expect(await screen.findByText(/cupom atualizado/i)).toBeInTheDocument()
  })

  it('"Desativar" na linha desativa pelo PATCH', async () => {
    const user = userEvent.setup()
    renderContent()
    const row = await rowOf('NATAL10')

    await user.click(within(row).getByRole('button', { name: /^desativar natal10$/i }))

    await waitFor(() => expect(lastPatch).toEqual({ id: 'cup-1', body: { active: false } }))
  })

  it('excluir: cupom sem usos pede confirmação; com usos o botão fica desabilitado', async () => {
    const user = userEvent.setup()
    renderContent()
    const used = await rowOf('NATAL10')

    expect(within(used).getByRole('button', { name: /natal10 já foi usado — desative/i })).toBeDisabled()

    const unused = await rowOf('FIXO20')
    await user.click(within(unused).getByRole('button', { name: /excluir fixo20/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    await waitFor(() => expect(deletedId).toBe('cup-2'))
    expect(await screen.findByText(/cupom excluído/i)).toBeInTheDocument()
  })

  it('"Ver usos" mostra os pedidos, com link e os devolvidos marcados', async () => {
    const user = userEvent.setup()
    renderContent()
    const row = await rowOf('NATAL10')

    await user.click(within(row).getByRole('button', { name: /usos de natal10/i }))
    const dialog = await screen.findByRole('dialog', { name: /usos do cupom natal10/i })
    expect(dialog).toHaveClass('max-w-3xl')
    expect(dialog).not.toHaveClass('max-w-md')

    expect(await within(dialog).findByRole('link', { name: '#42' })).toHaveAttribute('href', '/dashboard/orders/ord-1')
    expect(within(dialog).getByText('Ana')).toBeInTheDocument()
    expect(within(dialog).getByText(/R\$\s*12,50/)).toBeInTheDocument()
    expect(within(dialog).getByText('Devolvido')).toBeInTheDocument()
  })
})
