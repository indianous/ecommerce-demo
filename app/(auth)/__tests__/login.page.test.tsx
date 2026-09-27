import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import LoginPage from '../login/page'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'

const pushMock = vi.fn()
let searchParamsString = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(searchParamsString),
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
  searchParamsString = ''
  useAuthStore.getState().cancelMfa()
  useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false, mfaToken: null })
  useCartStore.setState({ items: [] })
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

  it('login com itens no carrinho local dispara POST /api/cart/merge', async () => {
    let mergeCalled = false
    server.use(
      http.post('/api/cart/merge', () => {
        mergeCalled = true
        return HttpResponse.json({ items: [], total: 0 })
      }),
    )
    useCartStore.setState({ items: [{ productId: 'p-1', name: 'Produto', price: 10, quantity: 1 }] })

    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'valid@test.com')
    await user.type(screen.getByLabelText(/senha/i), 'password123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(mergeCalled).toBe(true))
  })

  it('com callbackUrl na query string: login redireciona pra lá em vez da raiz do dashboard', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ accessToken: 'token', refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 900, role: 'EMPLOYEE' }),
      ),
    )
    searchParamsString = 'callbackUrl=%2Fdashboard%2Forders'
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'valid@test.com')
    await user.type(screen.getByLabelText(/senha/i), 'password123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard/orders'))
  })

  it.each([
    ['https%3A%2F%2Fevil.com', '/'],
    ['%2Fdashboard%2Forders', '/'],
    ['%2Forders', '/orders'],
  ])('CUSTOMER com callbackUrl=%s → push(%s)', async (callbackUrl, expected) => {
    searchParamsString = `callbackUrl=${callbackUrl}`
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'valid@test.com')
    await user.type(screen.getByLabelText(/senha/i), 'password123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(expected))
  })

  it('com sessionExpired=1 na query string: mostra aviso de sessão expirada', () => {
    searchParamsString = 'sessionExpired=1'
    renderLoginPage()

    expect(screen.getByText(/sessão expirou/i)).toBeInTheDocument()
  })

  it('sem sessionExpired: não mostra o aviso', () => {
    renderLoginPage()

    expect(screen.queryByText(/sessão expirou/i)).not.toBeInTheDocument()
  })

  it('o conteúdo fica numa coluna estreita (max-w-sm)', () => {
    renderLoginPage()

    const column = screen.getByRole('heading', { name: 'Entrar', level: 1 }).parentElement
    expect(column).toHaveClass('mx-auto', 'max-w-sm')
    expect(column).toContainElement(screen.getByRole('button', { name: /entrar/i }))
  })

  it('link "Esqueci minha senha" para /forgot-password', () => {
    renderLoginPage()

    expect(screen.getByRole('link', { name: /esqueci minha senha/i })).toHaveAttribute('href', '/forgot-password')
  })

  it('?passwordReset=1 → aviso de senha alterada', () => {
    searchParamsString = 'passwordReset=1'
    renderLoginPage()

    expect(screen.getByText('Senha alterada. Entre com a nova senha.')).toBeInTheDocument()
  })

  describe('verificação em duas etapas (plano 65)', () => {
    const employeeSession = { accessToken: 'token', tokenType: 'Bearer', expiresIn: 900, role: 'EMPLOYEE' }

    function loginAnswers(body: Record<string, unknown>) {
      server.use(http.post('/api/auth/login', () => HttpResponse.json(body)))
    }

    async function submitPassword(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByLabelText(/email/i), 'func@test.com')
      await user.type(screen.getByLabelText(/senha/i), 'password123')
      await user.click(screen.getByRole('button', { name: /entrar/i }))
    }

    async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string) {
      const [first] = await screen.findAllByRole('textbox', { name: /pin digit/i })
      await user.click(first)
      await user.keyboard(code)
    }

    it('mfaRequired: troca para a etapa do código, mostra o e-mail e esconde a senha', async () => {
      loginAnswers({ mfaRequired: true, mfaToken: 'm-1' })
      const user = userEvent.setup()
      renderLoginPage()

      await submitPassword(user)

      expect(await screen.findByText(/digite o código do seu app autenticador/i)).toBeInTheDocument()
      expect(screen.getByText('func@test.com')).toBeInTheDocument()
      expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument()
      expect(pushMock).not.toHaveBeenCalled()
    })

    it('código certo: entra e redireciona pelo postLoginPath (callbackUrl preservado)', async () => {
      loginAnswers({ mfaRequired: true, mfaToken: 'm-1' })
      server.use(http.post('/api/auth/mfa/verify', () => HttpResponse.json({ ...employeeSession, recoveryCodesRemaining: 10 })))
      searchParamsString = 'callbackUrl=%2Fdashboard%2Forders'
      const user = userEvent.setup()
      renderLoginPage()

      await submitPassword(user)
      await typeCode(user, '123456')

      await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard/orders'))
      expect(pushMock.mock.calls.flat().join()).not.toContain('m-1')
    })

    it('código errado: mostra o erro com as tentativas restantes', async () => {
      loginAnswers({ mfaRequired: true, mfaToken: 'm-1' })
      server.use(
        http.post('/api/auth/mfa/verify', () =>
          HttpResponse.json({ status: 401, code: 'INVALID_MFA_CODE', message: 'Código inválido', attemptsRemaining: 3 }, { status: 401 }),
        ),
      )
      const user = userEvent.setup()
      renderLoginPage()

      await submitPassword(user)
      await typeCode(user, '000000')

      expect(await screen.findByText('Código inválido')).toBeInTheDocument()
      expect(screen.getByText('3 tentativas restantes')).toBeInTheDocument()
      expect(pushMock).not.toHaveBeenCalled()
    })

    it('última tentativa errada (attemptsRemaining 0): volta direto para a senha', async () => {
      loginAnswers({ mfaRequired: true, mfaToken: 'm-1' })
      server.use(
        http.post('/api/auth/mfa/verify', () =>
          HttpResponse.json({ status: 401, code: 'INVALID_MFA_CODE', message: 'Código inválido', attemptsRemaining: 0 }, { status: 401 }),
        ),
      )
      const user = userEvent.setup()
      renderLoginPage()

      await submitPassword(user)
      await typeCode(user, '000000')

      expect(await screen.findByText('Muitas tentativas com código errado. Entre de novo com a senha.')).toBeInTheDocument()
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
    })

    it('410: volta para a senha com "Sua sessão de login expirou, entre de novo"', async () => {
      loginAnswers({ mfaRequired: true, mfaToken: 'm-1' })
      server.use(
        http.post('/api/auth/mfa/verify', () =>
          HttpResponse.json({ status: 410, code: 'MFA_CHALLENGE_EXPIRED', message: 'x' }, { status: 410 }),
        ),
      )
      const user = userEvent.setup()
      renderLoginPage()

      await submitPassword(user)
      await typeCode(user, '123456')

      expect(await screen.findByText('Sua sessão de login expirou, entre de novo')).toBeInTheDocument()
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
    })

    it('código de recuperação: entra e avisa quando restam poucos', async () => {
      loginAnswers({ mfaRequired: true, mfaToken: 'm-1' })
      let sent: unknown
      server.use(
        http.post('/api/auth/mfa/verify', async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json({ ...employeeSession, recoveryCodesRemaining: 2 })
        }),
      )
      const user = userEvent.setup()
      renderLoginPage()

      await submitPassword(user)
      await user.click(await screen.findByRole('button', { name: /usar um código de recuperação/i }))
      await user.type(screen.getByLabelText(/código de recuperação/i), 'abcdefgh')
      await user.click(screen.getByRole('button', { name: /^entrar$/i }))

      await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'))
      expect(sent).toEqual({ mfaToken: 'm-1', recoveryCode: 'ABCD-EFGH' })
      expect(await screen.findByText('Restam 2 códigos de recuperação — gere novos no seu perfil')).toBeInTheDocument()
    })

    it('"Voltar" na etapa do código volta para a senha', async () => {
      loginAnswers({ mfaRequired: true, mfaToken: 'm-1' })
      const user = userEvent.setup()
      renderLoginPage()

      await submitPassword(user)
      await user.click(await screen.findByRole('button', { name: /voltar/i }))

      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
      expect(useAuthStore.getState().mfaToken).toBeNull()
    })

    it('mfaSetupRequired: configuração obrigatória → QR code → códigos de recuperação → painel', async () => {
      loginAnswers({ mfaSetupRequired: true, mfaToken: 's-1' })
      server.use(
        http.post('/api/auth/mfa/setup/start', () =>
          HttpResponse.json({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/Loja:func%40test.com?secret=JBSWY3DPEHPK3PXP' }),
        ),
        http.post('/api/auth/mfa/setup/confirm', () =>
          HttpResponse.json({ ...employeeSession, recoveryCodes: ['AAAA-BBBB', 'CCCC-DDDD'] }),
        ),
      )
      const user = userEvent.setup()
      renderLoginPage()

      await submitPassword(user)

      expect(await screen.findByText(/para proteger o painel, configure a verificação em duas etapas/i)).toBeInTheDocument()
      expect(await screen.findByRole('img', { name: /qr code/i })).toBeInTheDocument()

      await typeCode(user, '123456')

      expect(await screen.findByText('AAAA-BBBB')).toBeInTheDocument()
      expect(pushMock).not.toHaveBeenCalled()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)

      await user.click(screen.getByRole('checkbox', { name: /guardei os códigos/i }))
      await user.click(screen.getByRole('button', { name: /continuar/i }))

      await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'))
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('configuração: 410 no confirm volta para a senha', async () => {
      loginAnswers({ mfaSetupRequired: true, mfaToken: 's-1' })
      server.use(
        http.post('/api/auth/mfa/setup/start', () => HttpResponse.json({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://x' })),
        http.post('/api/auth/mfa/setup/confirm', () => HttpResponse.json({ status: 410, message: 'x' }, { status: 410 })),
      )
      const user = userEvent.setup()
      renderLoginPage()

      await submitPassword(user)
      await typeCode(user, '123456')

      expect(await screen.findByText('Sua sessão de login expirou, entre de novo')).toBeInTheDocument()
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
    })

    it('configuração: "Voltar" encerra a tentativa de login (não dá para pular)', async () => {
      loginAnswers({ mfaSetupRequired: true, mfaToken: 's-1' })
      server.use(
        http.post('/api/auth/mfa/setup/start', () => HttpResponse.json({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://x' })),
      )
      const user = userEvent.setup()
      renderLoginPage()

      await submitPassword(user)
      await user.click(await screen.findByRole('button', { name: /voltar/i }))

      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
      expect(useAuthStore.getState().mfaToken).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })
})
