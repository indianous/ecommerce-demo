import { act, render } from '@testing-library/react'
import { http, HttpResponse, type RequestHandler } from 'msw'
import { setupServer } from 'msw/node'
import type { ReactElement } from 'react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'

export const fullSettings = {
  placeholderImageUrl: 'https://cdn.example.com/placeholder.jpg',
  faviconUrl: 'https://cdn.example.com/favicon.png',
  logoUrl: 'https://cdn.example.com/logo.svg',
  siteTitle: 'Loja',
  defaultDescription: 'A melhor loja',
  aboutUsContent: '# Sobre\n\nSomos uma loja.',
  contactDescription: 'Fale conosco.',
  contactPhone: '+55 11 99999-9999',
  contactEmail: 'contato@loja.com',
  instagramUrl: 'https://instagram.com/loja',
  tiktokUrl: 'https://tiktok.com/@loja',
  facebookUrl: 'https://facebook.com/loja',
  privacyPolicyContent: 'Política de privacidade.',
  termsContent: 'Termos e condições.',
  refundPolicyContent: 'Política de reembolso.',
  fiscalCompanyCnpj: null,
  fiscalCompanyLegalName: null,
  fiscalCompanyTradeName: null,
  fiscalCompanyStateRegistration: null,
  fiscalCompanyTaxRegime: null,
  fiscalCompanyStreet: null,
  fiscalCompanyNumber: null,
  fiscalCompanyNeighborhood: null,
  fiscalCompanyCity: null,
  fiscalCompanyState: null,
  fiscalCompanyZipCode: null,
  fiscalCompanyEmail: null,
  fiscalCompanyPhone: null,
}

export const emptySettings = Object.fromEntries(Object.keys(fullSettings).map((k) => [k, null]))

export const gatewayConfig = {
  active: 'MOCK',
  available: [
    { provider: 'MOCK', configured: true },
    { provider: 'STRIPE', configured: true },
    { provider: 'PAGSEGURO', configured: false },
  ],
}

const person = { phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null }

export const employeeWithSite = {
  isAuthenticated: true,
  accessToken: 'mock-token',
  role: 'EMPLOYEE' as const,
  user: { id: '1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE' as const, permissions: ['MANAGE_SITE' as const], ...person },
}

export const employeeWithoutSite = {
  isAuthenticated: true,
  accessToken: 'mock-token',
  role: 'EMPLOYEE' as const,
  user: { id: '2', name: 'Outro', email: 'outro@test.com', role: 'EMPLOYEE' as const, permissions: ['MANAGE_ORDERS' as const], ...person },
}

export const signedOut = { accessToken: null, user: null, role: null, isAuthenticated: false }

/** Servidor MSW com os endpoints de leitura das páginas de gestão; `handlers` sobrescrevem os padrões. */
export function setupSiteServer(...handlers: RequestHandler[]) {
  const server = setupServer(
    ...handlers,
    http.get('/api/site/settings', () => HttpResponse.json(fullSettings)),
    http.get('/api/site/banners', () => HttpResponse.json([])),
    http.get('/api/site/payment-gateway', () => HttpResponse.json(gatewayConfig)),
    http.get('/api/admin/site/melhor-envio', () => HttpResponse.json({ connected: false })),
  )
  beforeAll(() => server.listen())
  afterEach(async () => {
    server.resetHandlers()
    await act(async () => {
      useAuthStore.setState(signedOut)
    })
  })
  afterAll(() => server.close())
  return server
}

export function renderSection(ui: ReactElement) {
  return render(
    <ToastProvider>
      {ui}
      <ToastViewport />
    </ToastProvider>,
  )
}

export function signIn(state: typeof employeeWithSite | typeof employeeWithoutSite) {
  return act(async () => {
    useAuthStore.setState(state)
  })
}
