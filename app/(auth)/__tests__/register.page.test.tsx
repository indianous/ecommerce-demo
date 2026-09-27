import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import RegisterPage from '../register/page'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const server = setupServer(
  http.post('/api/auth/register', () =>
    HttpResponse.json(
      { accessToken: 'token', refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 900 },
      { status: 201 },
    ),
  ),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  pushMock.mockClear()
})
afterAll(() => server.close())

function renderRegisterPage() {
  return render(
    <ToastProvider>
      <RegisterPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('RegisterPage', () => {
  it('renders a heading and the register form', () => {
    renderRegisterPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/cadastr/i)
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cadastrar/i })).toBeInTheDocument()
  })

  it('links to the login page', () => {
    renderRegisterPage()
    expect(screen.getByRole('link', { name: /entrar/i })).toHaveAttribute('href', '/login')
  })

  it('redirects to home after a successful registration', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.type(screen.getByLabelText(/nome/i), 'João Victor')
    await user.type(screen.getByLabelText(/email/i), 'new@test.com')
    await user.type(screen.getByLabelText(/^senha/i), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'))
  })

  it('cadastro com sucesso → toast avisando do link de confirmação', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await fillAndSubmit(user, 'new@test.com')

    expect(await screen.findByText('Enviamos um link de confirmação para new@test.com')).toBeInTheDocument()
  })

  it('409 PASSWORD_NOT_SET → mensagem própria com link para o login, sem redirecionar', async () => {
    server.use(http.post('/api/auth/register', () => HttpResponse.json(
      { status: 409, code: 'PASSWORD_NOT_SET', message: 'Já existe uma conta com este e-mail. Enviamos um link para você definir sua senha.' },
      { status: 409 },
    )))
    const user = userEvent.setup()
    renderRegisterPage()

    await fillAndSubmit(user, 'balcao@test.com')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Já existe uma conta com este e-mail. Enviamos um link para você definir sua senha.')
    expect(within(alert).getByRole('link', { name: /ir para o login/i })).toHaveAttribute('href', '/login')
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('409 sem código → a mensagem de sempre em toast', async () => {
    server.use(http.post('/api/auth/register', () => HttpResponse.json(
      { status: 409, message: 'Email already in use: x@test.com' }, { status: 409 },
    )))
    const user = userEvent.setup()
    renderRegisterPage()

    await fillAndSubmit(user, 'x@test.com')

    expect(await screen.findByText('Email already in use: x@test.com')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /ir para o login/i })).not.toBeInTheDocument()
  })
})

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.type(screen.getByLabelText(/nome/i), 'João Victor')
  await user.type(screen.getByLabelText(/email/i), email)
  await user.type(screen.getByLabelText(/^senha/i), 'SecurePass123!')
  await user.click(screen.getByRole('button', { name: /cadastrar/i }))
}
