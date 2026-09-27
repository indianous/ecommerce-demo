import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import { EmailVerificationBanner } from '../EmailVerificationBanner'
import { useAuthStore } from '@/stores/auth.store'
import type { User } from '@/types'

const customer: User = {
  id: 'u1', name: 'Bia', email: 'bia@test.com', role: 'CUSTOMER', permissions: [],
  phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER', cpf: null, emailVerified: false,
}

let resendCalls = 0
let lastAuthorization: string | null = null
const server = setupServer(
  http.post('/api/auth/verify-email/resend', ({ request }) => {
    resendCalls++
    lastAuthorization = request.headers.get('Authorization')
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  resendCalls = 0
  lastAuthorization = null
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

function renderBanner(user: User | null) {
  useAuthStore.setState({ accessToken: user ? 'tok' : null, user, role: user?.role ?? null, isAuthenticated: !!user })
  return render(
    <ToastProvider>
      <EmailVerificationBanner />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('EmailVerificationBanner', () => {
  it('cliente não verificado → aviso com o e-mail e "Reenviar e-mail"', () => {
    renderBanner(customer)

    expect(screen.getByText(/confirme seu e-mail bia@test\.com para poder finalizar pedidos/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reenviar e-mail/i })).toBeEnabled()
  })

  it('reenviar → POST autenticado, toast e botão desabilitado (espera de 60 s)', async () => {
    const user = userEvent.setup()
    renderBanner(customer)

    await user.click(screen.getByRole('button', { name: /reenviar e-mail/i }))

    expect(await screen.findByText('Enviamos um novo link para bia@test.com')).toBeInTheDocument()
    expect(resendCalls).toBe(1)
    expect(lastAuthorization).toBe('Bearer tok')
    expect(screen.getByRole('button', { name: /reenviar e-mail/i })).toBeDisabled()
  })

  it.each([
    ['verificado', { ...customer, emailVerified: true }],
    ['funcionário', { ...customer, role: 'EMPLOYEE' as const }],
    ['admin', { ...customer, role: 'ADMIN' as const }],
    ['deslogado', null],
  ])('%s → não aparece', (_label, user) => {
    renderBanner(user)

    expect(screen.queryByText(/confirme seu e-mail/i)).not.toBeInTheDocument()
  })
})
