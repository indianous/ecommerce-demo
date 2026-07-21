import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import LoginPage from '../login/page'
import { useAuthStore } from '@/stores/auth.store'

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
      role: 'CUSTOMER',
    }),
  ),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  pushMock.mockClear()
  useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
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

  it('redirects to home after a successful login as CUSTOMER', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'valid@test.com')
    await user.type(screen.getByLabelText(/senha/i), 'password123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'))
  })

  it('redirects to dashboard after a successful login as EMPLOYEE', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({
          accessToken: 'token',
          refreshToken: 'refresh',
          tokenType: 'Bearer',
          expiresIn: 900,
          role: 'EMPLOYEE',
        }),
      ),
    )
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'employee@test.com')
    await user.type(screen.getByLabelText(/senha/i), 'password123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'))
  })

  it('redirects to /dashboard/admin after a successful login as ADMIN', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({
          accessToken: 'token',
          refreshToken: 'refresh',
          tokenType: 'Bearer',
          expiresIn: 900,
          role: 'ADMIN',
        }),
      ),
    )
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'admin@teste.com')
    await user.type(screen.getByLabelText(/senha/i), 'admin@123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard/admin'))
  })
})
