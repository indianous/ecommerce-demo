import { StrictMode } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import type { User } from '@/types'

const replaceMock = vi.fn()
let searchParamsString = 'token=tok_verify'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(searchParamsString),
}))

import VerifyEmailPage from '../verify-email/page'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'

const customer: User = {
  id: 'u1', name: 'Bia', email: 'bia@test.com', role: 'CUSTOMER', permissions: [],
  phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER', cpf: null, emailVerified: false,
}

let verifyCalls = 0
let verifyStatus = 204
let resendCalls = 0

const server = setupServer(
  http.post('/api/auth/verify-email', () => {
    verifyCalls++
    return verifyStatus === 204
      ? new HttpResponse(null, { status: 204 })
      : HttpResponse.json({ message: 'Este link expirou ou já foi usado' }, { status: verifyStatus })
  }),
  http.post('/api/auth/verify-email/resend', () => {
    resendCalls++
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  searchParamsString = 'token=tok_verify'
  verifyCalls = 0
  verifyStatus = 204
  resendCalls = 0
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
    useCartStore.setState({ items: [] })
  })
})
afterAll(() => server.close())

function logIn() {
  useAuthStore.setState({ accessToken: 'tok', user: customer, role: 'CUSTOMER', isAuthenticated: true })
}

function renderPage() {
  return render(
    <StrictMode>
      <ToastProvider>
        <VerifyEmailPage />
        <ToastViewport />
      </ToastProvider>
    </StrictMode>,
  )
}

describe('VerifyEmailPage', () => {
  it('com token: confirma uma vez só (mesmo no StrictMode) → "E-mail confirmado"', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'E-mail confirmado' })).toBeInTheDocument()
    expect(verifyCalls).toBe(1)
    expect(replaceMock).toHaveBeenCalledWith('/verify-email')
  })

  it('logado: marca o e-mail como verificado no store e oferece continuar comprando e ir ao checkout (com carrinho)', async () => {
    logIn()
    useCartStore.setState({ items: [{ productId: 'p1', name: 'Laptop', price: 10, quantity: 1 }] as never })
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'E-mail confirmado' })
    expect(useAuthStore.getState().user?.emailVerified).toBe(true)
    expect(screen.getByRole('link', { name: /continuar comprando/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /ir para o checkout/i })).toHaveAttribute('href', '/checkout')
  })

  it('logado sem carrinho: sem o botão do checkout', async () => {
    logIn()
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'E-mail confirmado' })
    expect(screen.queryByRole('link', { name: /ir para o checkout/i })).not.toBeInTheDocument()
  })

  it('deslogado: botão "Entrar"', async () => {
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'E-mail confirmado' })
    expect(screen.getByRole('link', { name: /entrar/i })).toHaveAttribute('href', '/login')
  })

  it('410 logado → "Este link expirou ou já foi usado" com "Enviar outro link"', async () => {
    verifyStatus = 410
    logIn()
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Este link expirou ou já foi usado' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /enviar outro link/i }))
    expect(await screen.findByText(/enviamos um novo link/i)).toBeInTheDocument()
    expect(resendCalls).toBe(1)
  })

  it('410 deslogado → "Entre para pedir outro link"', async () => {
    verifyStatus = 410
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Este link expirou ou já foi usado' })
    expect(screen.getByRole('link', { name: /entre para pedir outro link/i })).toHaveAttribute('href', '/login?callbackUrl=%2Fprofile')
  })

  it('sem token → "Link inválido", sem chamar o backend', () => {
    searchParamsString = ''
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Link inválido' })).toBeInTheDocument()
    expect(verifyCalls).toBe(0)
  })
})
