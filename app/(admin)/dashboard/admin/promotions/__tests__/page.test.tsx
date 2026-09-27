import { act, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dashboard/admin/promotions',
  useSearchParams: () => new URLSearchParams(),
}))

import { ToastProvider } from '@indianous/base-ds'
import AdminPromotionsPage, { metadata } from '../page'
import { useAuthStore } from '@/stores/auth.store'

const server = setupServer(
  http.get('/api/admin/promotions', () =>
    HttpResponse.json({
      content: [{
        id: 'promo-1', name: 'Fone Week', type: 'PERCENT', value: 20,
        startDate: '2026-09-20T00:00:00', endDate: '2026-09-30T23:59:00', status: 'ACTIVE', productCount: 4,
      }],
      totalPages: 1,
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

describe('AdminPromotionsPage', () => {
  it('admin vê as promoções', async () => {
    useAuthStore.setState({
      accessToken: 'tok', isAuthenticated: true, role: 'ADMIN',
      user: {
        id: 'a-1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN', permissions: [],
        phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null,
      },
    })

    render(
      <ToastProvider>
        <AdminPromotionsPage />
      </ToastProvider>,
    )

    expect(await screen.findByRole('heading', { name: 'Promoções' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Fone Week' })).toHaveAttribute('href', '/dashboard/admin/promotions/promo-1')
  })

  it('exporta o título da página', () => {
    expect(metadata.title).toBe('Promoções')
  })
})
