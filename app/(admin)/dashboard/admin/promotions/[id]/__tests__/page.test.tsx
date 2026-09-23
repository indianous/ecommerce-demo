import { act, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

import { ToastProvider } from 'base-ds'
import AdminPromotionDetailPage from '../page'
import { useAuthStore } from '@/stores/auth.store'

const server = setupServer(
  http.get('/api/admin/promotions/:id', () =>
    HttpResponse.json({
      id: 'promo-1', name: 'Fone Week', type: 'PERCENT', value: 20,
      startDate: '2026-09-20T00:00:00', endDate: '2026-09-30T23:59:00', status: 'ACTIVE', products: [],
    }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

describe('AdminPromotionDetailPage', () => {
  it('admin vê o detalhe, com o link de voltar para a lista do admin', async () => {
    useAuthStore.setState({
      accessToken: 'tok', isAuthenticated: true, role: 'ADMIN',
      user: {
        id: 'a-1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN', permissions: [],
        phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null,
      },
    })

    const jsx = await AdminPromotionDetailPage({ params: Promise.resolve({ id: 'promo-1' }) })
    render(<ToastProvider>{jsx}</ToastProvider>)

    expect(await screen.findByRole('heading', { name: 'Fone Week' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /voltar/i })).toHaveAttribute('href', '/dashboard/admin/promotions')
  })
})
