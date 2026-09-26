import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ForgotPasswordForm } from '../ForgotPasswordForm'

function renderForm(email: string) {
  const onEmailChange = vi.fn()
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
  render(<ForgotPasswordForm email={email} onEmailChange={onEmailChange} onSubmit={onSubmit} submitting={false} />)
  return { onEmailChange, onSubmit }
}

const submit = () => screen.getByRole('button', { name: /enviar link/i })

describe('ForgotPasswordForm', () => {
  it('e-mail vazio → botão desabilitado, sem erro', () => {
    renderForm('')
    expect(submit()).toBeDisabled()
    expect(screen.queryByText(/e-mail inválido/i)).not.toBeInTheDocument()
  })

  it('e-mail inválido → erro e botão desabilitado', () => {
    renderForm('ana@')
    expect(screen.getByText(/e-mail inválido/i)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('e-mail válido → botão habilitado e o envio chama onSubmit', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm('ana@test.com')

    await user.click(submit())

    expect(onSubmit).toHaveBeenCalled()
  })

  it('digitar repassa o valor', async () => {
    const user = userEvent.setup()
    const { onEmailChange } = renderForm('')

    await user.type(screen.getByLabelText(/e-mail/i), 'a')

    expect(onEmailChange).toHaveBeenCalledWith('a')
  })
})
