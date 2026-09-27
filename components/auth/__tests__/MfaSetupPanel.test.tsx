import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@indianous/base-ds'
import { describe, expect, it, vi } from 'vitest'
import { AuthError } from '@/stores/auth.store'
import { MfaSetupPanel } from '../MfaSetupPanel'

const setup = { secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/Loja:ana%40test.com?secret=JBSW' }

function renderPanel(props: Partial<React.ComponentProps<typeof MfaSetupPanel>> = {}) {
  const onConfirm = vi.fn().mockResolvedValue(undefined)
  render(
    <ToastProvider>
      <MfaSetupPanel setup={setup} onConfirm={onConfirm} {...props} />
    </ToastProvider>,
  )
  return { onConfirm }
}

async function typeCode(code: string) {
  const user = userEvent.setup()
  const [first] = screen.getAllByRole('textbox', { name: /pin digit/i })
  await user.click(first)
  await user.keyboard(code)
}

describe('MfaSetupPanel', () => {
  it('mostra os três passos, o QR code do otpauthUri e a chave em grupos de 4 com botão de copiar', () => {
    renderPanel()

    expect(screen.getByText(/instale um app autenticador/i)).toBeInTheDocument()
    expect(screen.getByText(/leia o qr code/i)).toBeInTheDocument()
    expect(screen.getByText(/digite o código/i)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: `QR Code: ${setup.otpauthUri}` })).toBeInTheDocument()
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copiar chave/i })).toBeInTheDocument()
  })

  it('sem setup ainda (carregando) → skeleton, sem QR code', () => {
    renderPanel({ setup: null })

    expect(screen.queryByRole('img', { name: /qr code/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/carregando/i)).toBeInTheDocument()
  })

  it('ao completar os 6 dígitos → chama onConfirm com o código', async () => {
    const { onConfirm } = renderPanel()

    await typeCode('123456')

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('123456'))
  })

  it('erro vindo do pai (prop error) aparece no painel', () => {
    renderPanel({ error: 'O código do app novo expirou. Digite o código que aparece agora.' })

    expect(screen.getByText('O código do app novo expirou. Digite o código que aparece agora.')).toBeInTheDocument()
  })

  it('código errado → mostra o erro com as tentativas restantes e limpa os dígitos', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new AuthError('Código inválido', 401, 'INVALID_MFA_CODE', 4))
    renderPanel({ onConfirm })

    await typeCode('000000')

    expect(await screen.findByText('Código inválido')).toBeInTheDocument()
    expect(screen.getByText('4 tentativas restantes')).toBeInTheDocument()
    screen.getAllByRole('textbox', { name: /pin digit/i }).forEach((input) => expect(input).toHaveValue(''))
  })
})
