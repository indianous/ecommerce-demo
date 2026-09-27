import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import { LoginForm } from '../LoginForm'

function renderLoginForm(props: React.ComponentProps<typeof LoginForm>) {
  return render(
    <ToastProvider>
      <LoginForm {...props} />
      <ToastViewport />
    </ToastProvider>,
  )
}

const server = setupServer(
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    if (body.email === 'valid@test.com' && body.password === 'password123') {
      return HttpResponse.json({
        accessToken: 'token',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        expiresIn: 900,
      })
    }
    return HttpResponse.json({ message: 'Credenciais inválidas' }, { status: 401 })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('LoginForm', () => {
  it('renders email, password fields and submit button', () => {
    renderLoginForm({ onSuccess: () => {} })

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('shows validation error when submitting empty form', async () => {
    const user = userEvent.setup()
    renderLoginForm({ onSuccess: () => {} })

    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByText(/email é obrigatório/i)).toBeInTheDocument()
    })
  })

  it('shows error message on invalid credentials', async () => {
    const user = userEvent.setup()
    renderLoginForm({ onSuccess: () => {} })

    await user.type(screen.getByLabelText(/email/i), 'wrong@test.com')
    await user.type(screen.getByLabelText(/^senha$/i), 'badpassword')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/credenciais inválidas/i)
    })
  })

  it('calls onSuccess callback after successful login', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()
    renderLoginForm({ onSuccess })

    await user.type(screen.getByLabelText(/email/i), 'valid@test.com')
    await user.type(screen.getByLabelText(/^senha$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })

  it('disables submit button while the request is in-flight', async () => {
    // Use a delayed handler to capture the loading state mid-request
    let resolveResponse!: () => void
    server.use(
      http.post('/api/auth/login', () =>
        new Promise<Response>((resolve) => {
          resolveResponse = () =>
            resolve(
              HttpResponse.json({ accessToken: 'tok', refreshToken: 'ref', tokenType: 'Bearer', expiresIn: 900 })
            )
        })
      )
    )

    const user = userEvent.setup()
    renderLoginForm({ onSuccess: () => {} })
    await user.type(screen.getByLabelText(/email/i), 'valid@test.com')
    await user.type(screen.getByLabelText(/^senha$/i), 'password123')

    const button = screen.getByRole('button', { name: /entrar/i })

    // Fire click but do NOT await — let request hang so we can observe disabled state
    const clickDone = user.click(button)

    await waitFor(() => expect(button).toBeDisabled())

    resolveResponse()
    await clickDone

    await waitFor(() => expect(button).not.toBeDisabled())
  })
})
