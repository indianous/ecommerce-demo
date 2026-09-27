import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: pushMock }),
}))

import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import { PromotionDetailContent } from '@/components/content/dashboard/catalog/PromotionDetailContent'
import { useAuthStore } from '@/stores/auth.store'
import type { PromotionDetail } from '@/types'

const detail: PromotionDetail = {
  id: 'promo-1', name: 'Black Friday', type: 'PERCENT', value: 20,
  startDate: '2026-09-20T00:00:00', endDate: '2026-09-30T23:59:00', status: 'ACTIVE',
  products: [
    { productId: 'p-1', name: 'Fone', slug: 'fone', imageUrl: null, price: 200, promotionalPrice: 160, active: true },
    { productId: 'p-2', name: 'Mouse', slug: 'mouse', imageUrl: null, price: 100, promotionalPrice: 80, active: true },
  ],
}

let current: PromotionDetail | null = detail
let getCount = 0
let removed: unknown = null
let putBody: unknown = null
let ended = false
let deleted = false

const server = setupServer(
  http.get('/api/admin/promotions/:id', () => {
    getCount++
    return current ? HttpResponse.json(current) : HttpResponse.json({ message: 'Promoção não encontrada' }, { status: 404 })
  }),
  http.put('/api/admin/promotions/:id', async ({ request }) => {
    putBody = await request.json()
    return HttpResponse.json({ ...detail, ...(putBody as object), productCount: 2 })
  }),
  http.post('/api/admin/promotions/:id/products/remove', async ({ request }) => {
    removed = await request.json()
    return HttpResponse.json({ ...detail, productCount: 1 })
  }),
  http.post('/api/admin/promotions/:id/end', () => {
    ended = true
    return HttpResponse.json({ ...detail, status: 'EXPIRED', productCount: 2 })
  }),
  http.delete('/api/admin/promotions/:id', () => {
    deleted = true
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  current = detail
  getCount = 0
  removed = null
  putBody = null
  ended = false
  deleted = false
  pushMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'tok', isAuthenticated: true, role: 'EMPLOYEE',
    user: {
      id: 'u-1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PRODUCTS'],
      phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null,
    },
  })
})

function renderDetail() {
  return render(
    <ToastProvider>
      <PromotionDetailContent id="promo-1" />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('PromotionDetailContent', () => {
  it('mostra a promoção (regra, período, situação) e os produtos dela', async () => {
    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Black Friday' })).toBeInTheDocument()
    expect(screen.getByText(/20% de desconto/i)).toBeInTheDocument()
    expect(screen.getByText(/20\/09\/2026 00:00 a 30\/09\/2026 23:59/)).toBeInTheDocument()
    expect(screen.getByText('Ativa')).toBeInTheDocument()
    const row = screen.getByText('Fone').closest('tr') as HTMLElement
    expect(within(row).getByText(/R\$\s*200,00/)).toBeInTheDocument()
    expect(within(row).getByText(/R\$\s*160,00/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /voltar/i })).toHaveAttribute('href', '/dashboard/promotions')
  })

  it('editar salva pelo PUT e recarrega a promoção', async () => {
    const user = userEvent.setup()
    renderDetail()
    await screen.findByRole('heading', { name: 'Black Friday' })

    await user.click(screen.getByRole('button', { name: /^editar$/i }))
    const dialog = screen.getByRole('dialog', { name: /editar promoção/i })
    await user.click(within(dialog).getByRole('button', { name: /salvar promoção/i }))

    await waitFor(() => expect(putBody).toMatchObject({ name: 'Black Friday', type: 'PERCENT', value: 20 }))
    await waitFor(() => expect(getCount).toBeGreaterThanOrEqual(2))
  })

  it('remover produtos selecionados pede confirmação e chama /products/remove', async () => {
    const user = userEvent.setup()
    renderDetail()
    await screen.findByText('Fone')

    await user.click(screen.getByRole('checkbox', { name: /selecionar mouse/i }))
    await user.click(screen.getByRole('button', { name: /remover da promoção/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    await waitFor(() => expect(removed).toEqual({ productIds: ['p-2'] }))
    expect(await screen.findByText(/1 produto removido da promoção/i)).toBeInTheDocument()
  })

  it('encerrar chama /end', async () => {
    const user = userEvent.setup()
    renderDetail()
    await screen.findByRole('heading', { name: 'Black Friday' })

    await user.click(screen.getByRole('button', { name: /^encerrar$/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    await waitFor(() => expect(ended).toBe(true))
  })

  it('excluir volta para a lista de promoções', async () => {
    const user = userEvent.setup()
    renderDetail()
    await screen.findByRole('heading', { name: 'Black Friday' })

    await user.click(screen.getByRole('button', { name: /^excluir$/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    await waitFor(() => expect(deleted).toBe(true))
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard/promotions'))
  })

  it('promoção inexistente mostra "Promoção não encontrada" com link para a lista', async () => {
    current = null
    renderDetail()

    expect(await screen.findByText(/promoção não encontrada/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /voltar/i })).toHaveAttribute('href', '/dashboard/promotions')
  })
})
