import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { formatRecoveryCode, MfaCodeForm } from '../MfaCodeForm'

type FormProps = Partial<React.ComponentProps<typeof MfaCodeForm>>

function renderForm(props: FormProps = {}) {
  const handlers = {
    onCodeChange: vi.fn(),
    onRecoveryCodeChange: vi.fn(),
    onToggleMode: vi.fn(),
    onSubmit: vi.fn(),
  }
  render(<MfaCodeForm mode="code" code="" recoveryCode="" submitting={false} {...handlers} {...props} />)
  return handlers
}

const digits = () => screen.getAllByRole('textbox', { name: /^dígito \d$/i })

describe('MfaCodeForm', () => {
  it('mostra os 6 campos "Dígito 1" a "Dígito 6" no grupo "Código de 6 dígitos"', () => {
    renderForm()
    expect(digits()).toHaveLength(6)
    expect(digits()[0]).toHaveAccessibleName('Dígito 1')
    expect(digits()[5]).toHaveAccessibleName('Dígito 6')
    expect(screen.getByRole('group', { name: 'Código de 6 dígitos' })).toBeInTheDocument()
  })

  it('o primeiro campo aceita o preenchimento automático do código e é o alvo do rótulo', async () => {
    const user = userEvent.setup()
    renderForm()

    expect(digits()[0]).toHaveAttribute('autocomplete', 'one-time-code')
    expect(digits()[0]).toHaveAttribute('id', 'mfa-code')
    await user.click(screen.getByText('Código de 6 dígitos', { selector: 'label' }))
    expect(digits()[0]).toHaveFocus()
  })

  it('colar o código inteiro no primeiro campo envia o código', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.click(digits()[0])
    await user.paste('123456')

    expect(onSubmit).toHaveBeenCalledWith('123456')
  })

  it('ao completar os 6 dígitos, envia sozinho', async () => {
    const user = userEvent.setup()
    const { onSubmit, onCodeChange } = renderForm()

    await user.click(digits()[0])
    await user.keyboard('123456')

    expect(onCodeChange).toHaveBeenLastCalledWith('123456')
    expect(onSubmit).toHaveBeenCalledWith('123456')
  })

  it('só aceita dígitos', async () => {
    const user = userEvent.setup()
    const { onCodeChange } = renderForm()

    await user.click(digits()[0])
    await user.keyboard('a')

    expect(onCodeChange).not.toHaveBeenCalledWith(expect.stringMatching(/a/))
  })

  it('"Usar um código de recuperação" troca de modo', async () => {
    const user = userEvent.setup()
    const { onToggleMode } = renderForm()

    await user.click(screen.getByRole('button', { name: /usar um código de recuperação/i }))

    expect(onToggleMode).toHaveBeenCalled()
  })

  it('modo recuperação: campo de texto normalizado (maiúsculas, hífen no meio)', async () => {
    const user = userEvent.setup()
    const { onRecoveryCodeChange } = renderForm({ mode: 'recovery' })

    await user.type(screen.getByLabelText(/código de recuperação/i), 'a')

    expect(onRecoveryCodeChange).toHaveBeenLastCalledWith('A')
    expect(screen.queryAllByRole('textbox', { name: /^dígito \d$/i })).toHaveLength(0)
    expect(screen.getByRole('button', { name: /usar o código do app/i })).toBeInTheDocument()
  })

  it('modo recuperação: código incompleto → botão desabilitado', () => {
    renderForm({ mode: 'recovery', recoveryCode: 'ABCD-EFG' })
    expect(screen.getByRole('button', { name: /^entrar$/i })).toBeDisabled()
  })

  it('modo recuperação: com os 8 caracteres, o envio manda o código', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm({ mode: 'recovery', recoveryCode: 'ABCD-EFGH' })

    await user.click(screen.getByRole('button', { name: /^entrar$/i }))

    expect(onSubmit).toHaveBeenCalledWith('ABCD-EFGH')
  })

  it.each([
    [3, '3 tentativas restantes'],
    [1, '1 tentativa restante'],
  ])('attemptsRemaining %i → "%s"', (attemptsRemaining, text) => {
    renderForm({ attemptsRemaining, error: 'Código inválido' })

    expect(screen.getByText('Código inválido')).toBeInTheDocument()
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('submitLabel personalizado (configuração: "Confirmar")', () => {
    renderForm({ mode: 'recovery', submitLabel: 'Confirmar', recoveryCode: 'ABCD-EFGH' })
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
  })

  it('sem onToggleMode (configuração), não oferece o código de recuperação', () => {
    render(
      <MfaCodeForm mode="code" code="" recoveryCode="" submitting={false} onCodeChange={vi.fn()} onRecoveryCodeChange={vi.fn()} onSubmit={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: /código de recuperação/i })).not.toBeInTheDocument()
  })
})

describe('formatRecoveryCode', () => {
  it.each([
    ['abcd', 'ABCD'],
    ['abcde', 'ABCD-E'],
    ['abcd-efgh', 'ABCD-EFGH'],
    ['ab cd ef gh', 'ABCD-EFGH'],
    ['ABCDEFGHIJ', 'ABCD-EFGH'],
    ['a!b@c', 'ABC'],
  ])('%s → %s', (input, expected) => {
    expect(formatRecoveryCode(input)).toBe(expected)
  })
})
