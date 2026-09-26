import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
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
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false, mfaToken: null })
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

  describe('cliente com 2FA (plano 65)', () => {
    async function loginWithPassword(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByLabelText(/e-mail/i), 'joao@test.com')
      await user.type(screen.getByLabelText(/senha/i), 'password123')
      await user.click(screen.getByRole('button', { name: /^entrar$/i }))
    }

    it('mfaRequired: mostra o campo do código no lugar do formulário; código certo autentica sem sair da página', async () => {
      server.use(
        http.post('/api/auth/login', () => HttpResponse.json({ mfaRequired: true, mfaToken: 'm-1' })),
        http.post('/api/auth/mfa/verify', () => HttpResponse.json({ ...mockTokens, recoveryCodesRemaining: 10 })),
      )
      const user = userEvent.setup()
      render(<CheckoutAuth />)

      await loginWithPassword(user)

      expect(await screen.findByText(/digite o código do seu app autenticador/i)).toBeInTheDocument()
      expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument()

      const [first] = screen.getAllByRole('textbox', { name: /pin digit/i })
      await user.click(first)
      await user.keyboard('123456')

      await vi.waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true))
    })

    it('código errado: mostra o erro e continua na etapa do código', async () => {
      server.use(
        http.post('/api/auth/login', () => HttpResponse.json({ mfaRequired: true, mfaToken: 'm-1' })),
        http.post('/api/auth/mfa/verify', () =>
          HttpResponse.json({ status: 401, message: 'Código inválido', attemptsRemaining: 4 }, { status: 401 }),
        ),
      )
      const user = userEvent.setup()
      render(<CheckoutAuth />)

      await loginWithPassword(user)
      const [first] = await screen.findAllByRole('textbox', { name: /pin digit/i })
      await user.click(first)
      await user.keyboard('000000')

      expect(await screen.findByText('Código inválido')).toBeInTheDocument()
      expect(screen.getByText('4 tentativas restantes')).toBeInTheDocument()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('"Voltar" retorna ao formulário de login', async () => {
      server.use(http.post('/api/auth/login', () => HttpResponse.json({ mfaRequired: true, mfaToken: 'm-1' })))
      const user = userEvent.setup()
      render(<CheckoutAuth />)

      await loginWithPassword(user)
      await user.click(await screen.findByRole('button', { name: /voltar/i }))

      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
      expect(useAuthStore.getState().mfaToken).toBeNull()
    })

    it('mfaSetupRequired (conta da equipe): manda entrar pelo login da equipe', async () => {
      server.use(http.post('/api/auth/login', () => HttpResponse.json({ mfaSetupRequired: true, mfaToken: 's-1' })))
      const user = userEvent.setup()
      render(<CheckoutAuth />)

      await loginWithPassword(user)

      expect(await screen.findByText(/entre pelo login da equipe/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /login da equipe/i })).toHaveAttribute('href', '/login')
      expect(useAuthStore.getState().mfaToken).toBeNull()
    })
  })
})
