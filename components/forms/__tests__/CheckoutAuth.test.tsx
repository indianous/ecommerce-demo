import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { CheckoutAuth } from '../CheckoutAuth'
import { useAuthStore } from '@/stores/auth.store'

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  role: 'CUSTOMER',
}

const mockUser = { id: 'user-1', name: 'João Victor', email: 'joao@test.com', role: 'CUSTOMER' }

const server = setupServer(
  http.post('/api/auth/login', () => HttpResponse.json(mockTokens)),
  http.post('/api/auth/register', () => HttpResponse.json({ ...mockTokens, role: 'CUSTOMER' })),
  http.get('/api/auth/me', () => HttpResponse.json(mockUser)),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

describe('CheckoutAuth', () => {
  it('renders the login tab selected by default', () => {
    render(<CheckoutAuth />)

    expect(screen.getByRole('tab', { name: /entrar/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /criar conta/i })).toHaveAttribute('aria-selected', 'false')
  })

  it('shows email and password fields on the login tab', () => {
    render(<CheckoutAuth />)

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/nome/i)).not.toBeInTheDocument()
  })

  it('shows name, email and password fields when switching to register tab', async () => {
    const user = userEvent.setup()
    render(<CheckoutAuth />)

    await user.click(screen.getByRole('tab', { name: /criar conta/i }))

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('sets accessToken in the store after successful login', async () => {
    const user = userEvent.setup()
    render(<CheckoutAuth />)

    await user.type(screen.getByLabelText(/e-mail/i), 'joao@test.com')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('button', { name: /entrar/i })).not.toBeDisabled()
    expect(useAuthStore.getState().accessToken).toBe('mock-access-token')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('sets accessToken in the store after successful registration', async () => {
    const user = userEvent.setup()
    render(<CheckoutAuth />)

    await user.click(screen.getByRole('tab', { name: /criar conta/i }))
    await user.type(screen.getByLabelText(/nome/i), 'João Victor')
    await user.type(screen.getByLabelText(/e-mail/i), 'joao@test.com')
    await user.type(screen.getByLabelText(/senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))

    expect(await screen.findByRole('button', { name: /criar conta/i })).not.toBeDisabled()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('shows an error alert when login fails', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: 'Credenciais inválidas' }, { status: 401 }),
      ),
    )

    const user = userEvent.setup()
    render(<CheckoutAuth />)

    await user.type(screen.getByLabelText(/e-mail/i), 'wrong@test.com')
    await user.type(screen.getByLabelText(/senha/i), 'errada')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/credenciais inválidas/i)
  })

  it('clears the error when switching tabs', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: 'Credenciais inválidas' }, { status: 401 }),
      ),
    )

    const user = userEvent.setup()
    render(<CheckoutAuth />)

    await user.type(screen.getByLabelText(/e-mail/i), 'wrong@test.com')
    await user.type(screen.getByLabelText(/senha/i), 'errada')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    await screen.findByRole('alert')

    await user.click(screen.getByRole('tab', { name: /criar conta/i }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
