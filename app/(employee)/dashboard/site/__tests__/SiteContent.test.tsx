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
  fiscalCompanyCnpj: null, fiscalCompanyLegalName: null, fiscalCompanyTradeName: null,
  fiscalCompanyStateRegistration: null, fiscalCompanyTaxRegime: null, fiscalCompanyStreet: null,
  fiscalCompanyNumber: null, fiscalCompanyNeighborhood: null, fiscalCompanyCity: null,
  fiscalCompanyState: null, fiscalCompanyZipCode: null,
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
  http.put('/api/site/settings/fiscal-company-data', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...emptySettings, ...body })
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

describe('SiteContent — Dados fiscais da empresa', () => {
  it('com MANAGE_SITE: preenche e salva os dados fiscais com sucesso', async () => {
    const user = userEvent.setup()
    await act(async () => {
      useAuthStore.setState(authenticatedWithSite)
    })
    renderContent()

    const heading = await screen.findByRole('heading', { name: /dados fiscais da empresa/i })
    const card = heading.closest('section') as HTMLElement
    await user.click(within(card).getByRole('button', { name: /editar/i }))

    const dialog = await screen.findByRole('dialog', { name: /dados fiscais da empresa/i })
    await user.type(within(dialog).getByLabelText(/cnpj/i), '11444777000161')
    await user.type(within(dialog).getByLabelText(/razão social/i), 'Empresa Teste LTDA')
    await user.type(within(dialog).getByLabelText(/rua\/logradouro/i), 'Rua A')
    await user.type(within(dialog).getByLabelText(/número/i), '1')
    await user.type(within(dialog).getByLabelText(/bairro/i), 'Centro')
    await user.type(within(dialog).getByLabelText(/cidade/i), 'SP')
    await user.type(within(dialog).getByLabelText(/^estado$/i), 'SP')
    await user.type(within(dialog).getByLabelText(/cep/i), '01000000')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText(/atualizados com sucesso/i)).toBeInTheDocument()
  })

  it('sem MANAGE_SITE: seção de dados fiscais não aparece', async () => {
    await act(async () => {
      useAuthStore.setState(authenticatedWithoutSite)
    })
    renderContent()

    expect(screen.queryByRole('heading', { name: /dados fiscais da empresa/i })).not.toBeInTheDocument()
  })
})

describe('SiteContent — Navegação do site', () => {
  it('com MANAGE_SITE: mostra o card "Navegação do site" com link para /dashboard/site/navigation', async () => {
    await act(async () => {
      useAuthStore.setState(authenticatedWithSite)
    })
    renderContent()

    const heading = await screen.findByRole('heading', { name: /navegação do site/i })
    const card = heading.closest('section') as HTMLElement
    expect(within(card).getByRole('link', { name: /gerenciar navegação/i })).toHaveAttribute(
      'href',
      '/dashboard/site/navigation',
    )
  })

  it('sem MANAGE_SITE: card de navegação não aparece', async () => {
    await act(async () => {
      useAuthStore.setState(authenticatedWithoutSite)
    })
    renderContent()

    expect(screen.queryByRole('heading', { name: /navegação do site/i })).not.toBeInTheDocument()
  })
})
