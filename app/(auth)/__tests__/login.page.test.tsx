import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import LoginPage from '../login/page'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const server = setupServer(
  http.post('/api/auth/login', () =>
    HttpResponse.json({
      accessToken: 'token',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      expiresIn: 900,
    }),
  ),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  pushMock.mockClear()
})
afterAll(() => server.close())

function renderLoginPage() {
  return render(
    <ToastProvider>
      <LoginPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('LoginPage', () => {
  it('renders a heading and the login form', () => {
    renderLoginPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/entrar/i)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('links to the register page', () => {
    renderLoginPage()
    expect(screen.getByRole('link', { name: /cadastr/i })).toHaveAttribute('href', '/register')
  })

  it('redirects to the catalog after a successful login', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'valid@test.com')
    await user.type(screen.getByLabelText(/senha/i), 'password123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/catalog'))
  })
})
