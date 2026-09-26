import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import ForgotPasswordPage from '../forgot-password/page'

let lastBody: unknown = null
const server = setupServer(
  http.post('/api/auth/forgot-password', async ({ request }) => {
    lastBody = await request.json()
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  lastBody = null
})
afterAll(() => server.close())

function renderPage() {
  return render(
    <ToastProvider>
      <ForgotPasswordPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

async function requestLink(email: string) {
  const user = userEvent.setup()
  renderPage()
  await user.type(screen.getByLabelText(/e-mail/i), email)
  await user.click(screen.getByRole('button', { name: /enviar link/i }))
}

const CONFIRMATION = 'Se houver uma conta com este e-mail, enviamos um link. Ele vale por 1 hora.'

describe('ForgotPasswordPage', () => {
  it('título e link para voltar ao login', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Esqueci minha senha')
    expect(screen.getByRole('link', { name: /voltar para o login/i })).toHaveAttribute('href', '/login')
  })

  it('enviar → POST com o e-mail e a tela troca para a confirmação', async () => {
    await requestLink('ana@test.com')

    expect(await screen.findByText(CONFIRMATION)).toBeInTheDocument()
    expect(lastBody).toEqual({ email: 'ana@test.com' })
    expect(screen.queryByRole('button', { name: /enviar link/i })).not.toBeInTheDocument()
  })

  it('a mesma mensagem para qualquer e-mail (o backend sempre responde 204)', async () => {
    await requestLink('ninguem@test.com')

    expect(await screen.findByText(CONFIRMATION)).toBeInTheDocument()
  })

  it('429 → aviso de muitas tentativas, e o formulário continua', async () => {
    server.use(http.post('/api/auth/forgot-password', () => HttpResponse.json({ status: 429 }, { status: 429 })))

    await requestLink('ana@test.com')

    expect(await screen.findByText('Muitas tentativas. Tente de novo em alguns minutos.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar link/i })).toBeInTheDocument()
  })
})
