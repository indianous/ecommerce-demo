import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { SiteContent } from '../SiteContent'
import { useAuthStore } from '@/stores/auth.store'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

const emptySettings = {
  placeholderImageUrl: null, faviconUrl: null, logoUrl: null, siteTitle: null,
  defaultDescription: null, aboutUsContent: null, contactDescription: null,
  contactPhone: null, contactEmail: null, instagramUrl: null, tiktokUrl: null,
  facebookUrl: null, privacyPolicyContent: null, termsContent: null, refundPolicyContent: null,
}

const gatewayConfig = {
  active: 'MOCK',
  available: [
    { provider: 'MOCK', configured: true },
    { provider: 'STRIPE', configured: true },
    { provider: 'PAGSEGURO', configured: false },
  ],
}

const server = setupServer(
  http.get('/api/site/settings', () => HttpResponse.json(emptySettings)),
  http.get('/api/site/banners', () => HttpResponse.json([])),
  http.get('/api/site/payment-gateway', () => HttpResponse.json(gatewayConfig)),
  http.put('/api/site/payment-gateway', async ({ request }) => {
    const body = (await request.json()) as { provider: string }
    return HttpResponse.json({ ...gatewayConfig, active: body.provider })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

const authenticatedWithSite = {
  isAuthenticated: true,
  accessToken: 'mock-token',
  role: 'EMPLOYEE' as const,
  user: {
    id: '1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE' as const,
    permissions: ['MANAGE_SITE' as const],
  },
}

const authenticatedWithoutSite = {
  isAuthenticated: true,
  accessToken: 'mock-token',
  role: 'EMPLOYEE' as const,
  user: {
    id: '2', name: 'Other', email: 'other@test.com', role: 'EMPLOYEE' as const,
    permissions: ['MANAGE_ORDERS' as const],
  },
}

function renderContent() {
  return render(
    <ToastProvider>
      <SiteContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('SiteContent — Gateway de pagamento', () => {
  it('com MANAGE_SITE: busca, mostra o ativo, troca e salva com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => {
      useAuthStore.setState(authenticatedWithSite)
    })
    renderContent()

    const heading = await screen.findByRole('heading', { name: /gateway de pagamento/i })
    const card = heading.closest('section') as HTMLElement
    await user.click(within(card).getByRole('button', { name: /editar/i }))

    const dialog = await screen.findByRole('dialog', { name: /gateway de pagamento/i })
    expect(within(dialog).getByRole('radio', { name: /mock/i })).toBeChecked()

    await user.click(within(dialog).getByRole('radio', { name: /stripe/i }))
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText(/atualizado com sucesso/i)).toBeInTheDocument()
  })

  it('troca para provider não configurado mostra erro do backend (409) sem atualizar estado', async () => {
    server.use(
      http.put('/api/site/payment-gateway', () =>
        HttpResponse.json({ message: 'Gateway STRIPE não está configurado no servidor' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    await act(async () => {
      useAuthStore.setState(authenticatedWithSite)
    })
    renderContent()

    const heading = await screen.findByRole('heading', { name: /gateway de pagamento/i })
    const card = heading.closest('section') as HTMLElement
    await user.click(within(card).getByRole('button', { name: /editar/i }))

    const dialog = await screen.findByRole('dialog', { name: /gateway de pagamento/i })
    await user.click(within(dialog).getByRole('radio', { name: /stripe/i }))
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    await screen.findAllByText(/não está configurado/i)
    expect(within(dialog).getByRole('radio', { name: /mock/i })).toBeChecked()
  })

  it('sem MANAGE_SITE: página inteira (incluindo seção de gateway) não aparece', async () => {
    await act(async () => {
      useAuthStore.setState(authenticatedWithoutSite)
    })
    renderContent()

    expect(screen.queryByRole('heading', { name: /gateway de pagamento/i })).not.toBeInTheDocument()
  })
})
