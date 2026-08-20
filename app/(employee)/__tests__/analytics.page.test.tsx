import { act, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
}))

import { ToastProvider } from 'base-ds'
import { AnalyticsContent } from '../dashboard/analytics/AnalyticsContent'
import { useAuthStore } from '@/stores/auth.store'

const mockFunnel = {
  visitors: 100,
  productViews: 50,
  cartAdds: 20,
  checkoutsStarted: 10,
  purchasesCompleted: 5,
  visitorToProductViewRate: 0.5,
  productViewToCartAddRate: 0.4,
  cartAddToCheckoutRate: 0.5,
  checkoutToPurchaseRate: 0.5,
}

const mockChannels = [
  { channel: 'google / cpc', signups: 10, buyers: 2, conversionRate: 0.2, revenue: 400, averageOrderValue: 200 },
  { channel: 'Direto/não identificado', signups: 5, buyers: 0, conversionRate: 0, revenue: 0, averageOrderValue: 0 },
]

let lastFunnelQuery: string | null = null
let lastChannelsQuery: string | null = null

const server = setupServer(
  http.get('/api/admin/analytics/funnel', ({ request }) => {
    lastFunnelQuery = new URL(request.url).search
    return HttpResponse.json(mockFunnel)
  }),
  http.get('/api/admin/analytics/channels', ({ request }) => {
    lastChannelsQuery = new URL(request.url).search
    return HttpResponse.json(mockChannels)
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  lastFunnelQuery = null
  lastChannelsQuery = null
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ANALYTICS'], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' },
  })
})

function renderAnalytics() {
  return render(
    <ToastProvider>
      <AnalyticsContent />
    </ToastProvider>,
  )
}

describe('AnalyticsContent', () => {
  it('renderiza as 5 etapas do funil vindas de GET /api/admin/analytics/funnel', async () => {
    renderAnalytics()

    expect(await screen.findByText(/visitantes/i)).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('renderiza a conversão por canal vinda de GET /api/admin/analytics/channels', async () => {
    renderAnalytics()

    expect((await screen.findAllByText(/google \/ cpc/i)).length).toBeGreaterThan(0)
  })

  it('canal "Direto/não identificado" aparece na lista sem tratamento especial', async () => {
    renderAnalytics()

    await screen.findAllByText(/google \/ cpc/i)
    expect(screen.getAllByText(/direto\/não identificado/i).length).toBeGreaterThan(0)
  })

  it('trocar o intervalo de datas refaz as duas chamadas com os novos from/to', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    renderAnalytics()
    await screen.findByText(/visitantes/i)

    const fromInput = screen.getByLabelText('De')
    await user.clear(fromInput)
    await user.type(fromInput, '2026-07-01')

    await vi.waitFor(() => {
      expect(lastFunnelQuery).toContain('from=2026-07-01')
      expect(lastChannelsQuery).toContain('from=2026-07-01')
    })
  })

  it('bloqueia o acesso de quem não tem MANAGE_ANALYTICS nem é ADMIN', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' },
    })
    await act(async () => {
      render(<ToastProvider><AnalyticsContent /></ToastProvider>)
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
