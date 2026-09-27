import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dashboard/admin/coupons',
  useSearchParams: () => new URLSearchParams(),
}))

import { ToastProvider } from '@indianous/base-ds'
import AdminCouponsPage, { metadata } from '../page'
import { useAuthStore } from '@/stores/auth.store'

const server = setupServer(
  http.get('/api/admin/coupons', () => HttpResponse.json({
    content: [{
      id: 'cup-1', code: 'NATAL10', type: 'PERCENT', value: 10, maxDiscountAmount: null, minSubtotal: null,
      startsAt: null, endsAt: null, maxUses: null, maxUsesPerCustomer: null, active: true, usesCount: 1, status: 'ACTIVE',
    }],
    totalPages: 1,
  })),
  http.get('/api/admin/coupons/:id/redemptions', () => HttpResponse.json({
    content: [{ orderId: 'ord-1', orderNumber: 42, customerName: 'Ana', discountAmount: 5, redeemedAt: '2026-12-02T10:00:00', releasedAt: null }],
    totalPages: 1,
  })),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

describe('AdminCouponsPage', () => {
  it('admin vê os cupons, e os usos apontam para os pedidos do admin', async () => {
    useAuthStore.setState({
      accessToken: 'tok', isAuthenticated: true, role: 'ADMIN',
      user: {
        id: 'a-1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN', permissions: [],
        phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null,
      },
    })
    const user = userEvent.setup()
    render(<ToastProvider><AdminCouponsPage /></ToastProvider>)

    const row = (await screen.findByText('NATAL10')).closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: /usos de natal10/i }))

    expect(await screen.findByRole('link', { name: '#42' })).toHaveAttribute('href', '/dashboard/admin/orders/ord-1')
  })

  it('exporta o título', () => {
    expect(metadata.title).toBe('Cupons')
  })
})
