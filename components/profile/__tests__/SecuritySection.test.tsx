import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/stores/auth.store'
import type { User } from '@/types'
import { SecuritySection } from '../SecuritySection'

const baseUser: User = {
  id: 'u-1',
  name: 'Ana',
  email: 'ana@test.com',
  role: 'CUSTOMER',
  permissions: [],
  phone: null,
  birthDate: null,
  gender: 'PREFIRO_NAO_DIZER',
  cpf: null,
  emailVerified: true,
  mfaEnabled: false,
  mfaEnabledAt: null,
  recoveryCodesRemaining: 0,
}
const enabledUser: User = { ...baseUser, mfaEnabled: true, mfaEnabledAt: '2026-09-24T12:00:00Z', recoveryCodesRemaining: 7 }
const codes = ['AAAA-BBBB', 'CCCC-DDDD']
const setupInfo = { secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/Loja:ana%40test.com?secret=JBSWY3DPEHPK3PXP' }

let me: User = baseUser
const server = setupServer(
  http.get('/api/auth/me', () => HttpResponse.json(me)),
  http.post('/api/auth/me/mfa/setup/start', () => HttpResponse.json(setupInfo)),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
})
afterAll(() => server.close())

function renderSection(user: User) {
  me = user
  useAuthStore.setState({ accessToken: 'tok', user, role: user.role, isAuthenticated: true })
  render(
    <ToastProvider>
      <SecuritySection />
      <ToastViewport />
    </ToastProvider>,
  )
}

async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string, container: HTMLElement = document.body) {
  const [first] = await within(container).findAllByRole('textbox', { name: /^dígito \d$/i })
  await user.click(first)
  await user.keyboard(code)
}

describe('SecuritySection', () => {
  it('cliente sem 2FA: "desativada" e botão Ativar', () => {
    renderSection(baseUser)

    expect(screen.getByRole('heading', { name: /verificação em duas etapas/i })).toBeInTheDocument()
    expect(screen.getByText(/desativada/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^ativar$/i })).toBeInTheDocument()
  })

  it('ativar: QR code → código → códigos de recuperação → "Ativada"', async () => {
    let sent: unknown
    server.use(
      http.post('/api/auth/me/mfa/setup/confirm', async ({ request }) => {
        sent = await request.json()
        me = enabledUser
        return HttpResponse.json({ recoveryCodes: codes })
      }),
    )
    const user = userEvent.setup()
    renderSection(baseUser)

    await user.click(screen.getByRole('button', { name: /^ativar$/i }))
    expect(await screen.findByRole('img', { name: /qr code/i })).toBeInTheDocument()
    await typeCode(user, '123456')

    expect(await screen.findByText('AAAA-BBBB')).toBeInTheDocument()
    expect(sent).toEqual({ code: '123456' })
    await user.click(screen.getByRole('checkbox', { name: /guardei os códigos/i }))
    await user.click(screen.getByRole('button', { name: /concluir/i }))

    expect(await screen.findByText(/ativada desde 24\/09\/2026/i)).toBeInTheDocument()
    expect(useAuthStore.getState().user?.mfaEnabled).toBe(true)
  })

  it('com 2FA: data de ativação, códigos restantes e as ações', () => {
    renderSection(enabledUser)

    expect(screen.getByText(/ativada desde 24\/09\/2026/i)).toBeInTheDocument()
    expect(screen.getByText('Códigos de recuperação restantes: 7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gerar novos códigos/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /trocar de celular/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^desativar$/i })).toBeInTheDocument()
  })

  it('gerar novos códigos: pede um código do app e mostra os códigos novos', async () => {
    let sent: unknown
    server.use(
      http.post('/api/auth/me/mfa/recovery-codes', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ recoveryCodes: codes })
      }),
    )
    const user = userEvent.setup()
    renderSection(enabledUser)

    await user.click(screen.getByRole('button', { name: /gerar novos códigos/i }))
    await typeCode(user, '123456')

    expect(await screen.findByText('CCCC-DDDD')).toBeInTheDocument()
    expect(sent).toEqual({ code: '123456' })
  })

  it('gerar novos códigos com código errado: mostra o erro', async () => {
    server.use(
      http.post('/api/auth/me/mfa/recovery-codes', () =>
        HttpResponse.json({ status: 400, code: 'INVALID_MFA_CODE', message: 'Código inválido' }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    renderSection(enabledUser)

    await user.click(screen.getByRole('button', { name: /gerar novos códigos/i }))
    await typeCode(user, '000000')

    expect(await screen.findByText('Código inválido')).toBeInTheDocument()
  })

  it('trocar de celular: QR do app novo → código novo → código do app atual → códigos de recuperação', async () => {
    let sent: unknown
    server.use(
      http.post('/api/auth/me/mfa/setup/confirm', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ recoveryCodes: codes })
      }),
    )
    const user = userEvent.setup()
    renderSection(enabledUser)

    await user.click(screen.getByRole('button', { name: /trocar de celular/i }))
    expect(await screen.findByRole('img', { name: /qr code/i })).toBeInTheDocument()
    await typeCode(user, '111111')

    expect(await screen.findByText(/digite o código do app atual/i)).toBeInTheDocument()
    await typeCode(user, '222222')

    expect(await screen.findByText('AAAA-BBBB')).toBeInTheDocument()
    expect(sent).toEqual({ code: '111111', currentCode: '222222' })
  })

  it('trocar de celular com o código atual errado: fica na etapa do código atual com o erro', async () => {
    server.use(
      http.post('/api/auth/me/mfa/setup/confirm', () =>
        HttpResponse.json({ status: 400, code: 'INVALID_CURRENT_MFA_CODE', message: 'Código do app atual inválido' }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    renderSection(enabledUser)

    await user.click(screen.getByRole('button', { name: /trocar de celular/i }))
    await screen.findByRole('img', { name: /qr code/i })
    await typeCode(user, '111111')
    await screen.findByText(/digite o código do app atual/i)
    await typeCode(user, '000000')

    expect(await screen.findByText('Código do app atual inválido')).toBeInTheDocument()
    expect(screen.getByText(/digite o código do app atual/i)).toBeInTheDocument()
  })

  it('cliente desativa: Dialog com senha e código → toast e volta para "desativada"', async () => {
    let sent: unknown
    server.use(
      http.post('/api/auth/me/mfa/disable', async ({ request }) => {
        sent = await request.json()
        me = baseUser
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderSection(enabledUser)

    await user.click(screen.getByRole('button', { name: /^desativar$/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('group', { name: 'Código do app autenticador' })).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/^senha$/i), 'minhaSenha1')
    await typeCode(user, '123456', dialog)
    await user.click(within(dialog).getByRole('button', { name: /^desativar$/i }))

    await waitFor(() => expect(sent).toEqual({ password: 'minhaSenha1', code: '123456' }))
    expect(await screen.findByText('Verificação em duas etapas desativada')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^ativar$/i })).toBeInTheDocument()
  })

  it('desativar com senha errada: erro dentro do Dialog', async () => {
    server.use(
      http.post('/api/auth/me/mfa/disable', () =>
        HttpResponse.json({ status: 400, code: 'INVALID_PASSWORD', message: 'Senha incorreta' }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    renderSection(enabledUser)

    await user.click(screen.getByRole('button', { name: /^desativar$/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^senha$/i), 'errada123')
    await typeCode(user, '123456', dialog)
    await user.click(within(dialog).getByRole('button', { name: /^desativar$/i }))

    expect(await within(dialog).findByText('Senha incorreta')).toBeInTheDocument()
  })

  it('admin e funcionário: "Obrigatória para a equipe" e sem Desativar', () => {
    renderSection({ ...enabledUser, role: 'EMPLOYEE' })

    expect(screen.getByText(/obrigatória para a equipe/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^desativar$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /trocar de celular/i })).toBeInTheDocument()
  })
})
