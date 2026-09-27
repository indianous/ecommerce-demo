import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from '@indianous/base-ds'

const pushMock = vi.fn()
const replaceMock = vi.fn()
let searchParamsString = 'token=tok_ABC-123'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(searchParamsString),
}))

import ResetPasswordPage from '../reset-password/page'

let tokenInfo: { status: number; body?: unknown } = {
  status: 200,
  body: { purpose: 'RESET', email: 'a***@test.com', expiresAt: '2026-09-24T13:00:00Z' },
}
let lastInspected = ''
let lastResetBody: unknown = null

const server = setupServer(
  http.get('/api/auth/password-tokens/:token', ({ params }) => {
    lastInspected = params.token as string
    return HttpResponse.json(tokenInfo.body ?? { message: 'Este link expirou ou já foi usado' }, { status: tokenInfo.status })
  }),
  http.post('/api/auth/reset-password', async ({ request }) => {
    lastResetBody = await request.json()
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  pushMock.mockClear()
  replaceMock.mockClear()
  searchParamsString = 'token=tok_ABC-123'
  tokenInfo = { status: 200, body: { purpose: 'RESET', email: 'a***@test.com', expiresAt: '2026-09-24T13:00:00Z' } }
  lastInspected = ''
  lastResetBody = null
})
afterAll(() => server.close())

function renderPage() {
  return render(
    <ToastProvider>
      <ResetPasswordPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

async function fillAndSubmit(password = 'senhaNova123') {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(/^nova senha$/i), password)
  await user.type(screen.getByLabelText(/confirmar/i), password)
  await user.click(screen.getByRole('button', { name: /salvar senha/i }))
}

describe('ResetPasswordPage', () => {
  it('sem token na URL → "Link inválido" com o link para pedir outro', () => {
    searchParamsString = ''
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Link inválido')
    expect(screen.getByRole('link', { name: /pedir um novo link/i })).toHaveAttribute('href', '/forgot-password')
  })

  it('RESET → "Redefinir senha" com o e-mail mascarado', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Redefinir senha' })).toBeInTheDocument()
    expect(screen.getByText(/a\*\*\*@test\.com/)).toBeInTheDocument()
    expect(lastInspected).toBe('tok_ABC-123')
  })

  it('SET_PASSWORD → "Definir sua senha" e texto de boas-vindas', async () => {
    tokenInfo = { status: 200, body: { purpose: 'SET_PASSWORD', email: 'b***@test.com', expiresAt: '2026-10-01T12:00:00Z' } }
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Definir sua senha' })).toBeInTheDocument()
    expect(screen.getByText(/boas-vindas/i)).toBeInTheDocument()
    expect(screen.getByText(/b\*\*\*@test\.com/)).toBeInTheDocument()
  })

  it('410 ao carregar → "Este link expirou ou já foi usado" com botão para pedir outro', async () => {
    tokenInfo = { status: 410 }
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Este link expirou ou já foi usado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /pedir um novo link/i })).toHaveAttribute('href', '/forgot-password')
  })

  it('limpa o token da URL depois de ler (fica só em memória)', async () => {
    renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Redefinir senha' })
    expect(replaceMock).toHaveBeenCalledWith('/reset-password')
  })

  it('enviar → POST com token e senhas e redireciona para /login?passwordReset=1', async () => {
    renderPage()
    await fillAndSubmit()

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login?passwordReset=1'))
    expect(lastResetBody).toEqual({ token: 'tok_ABC-123', newPassword: 'senhaNova123', confirmPassword: 'senhaNova123' })
  })

  it('400 no envio → mensagem do backend no formulário', async () => {
    server.use(http.post('/api/auth/reset-password', () =>
      HttpResponse.json({ status: 400, message: 'As senhas não coincidem' }, { status: 400 })))
    renderPage()
    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('As senhas não coincidem')
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('410 no envio → estado de link expirado', async () => {
    server.use(http.post('/api/auth/reset-password', () =>
      HttpResponse.json({ status: 410, message: 'Este link expirou ou já foi usado' }, { status: 410 })))
    renderPage()
    await fillAndSubmit()

    expect(await screen.findByRole('heading', { level: 1, name: 'Este link expirou ou já foi usado' })).toBeInTheDocument()
  })
})
