import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
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

  it('redirects to the catalog after a successful registration', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await user.type(screen.getByLabelText(/nome/i), 'João Victor')
    await user.type(screen.getByLabelText(/email/i), 'new@test.com')
    await user.type(screen.getByLabelText(/^senha/i), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/catalog'))
  })
})
