import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResetPasswordForm } from '../ResetPasswordForm'

function renderForm(password: string, confirmPassword: string, error?: string) {
  const onPasswordChange = vi.fn()
  const onConfirmPasswordChange = vi.fn()
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
  render(
    <ResetPasswordForm
      password={password}
      confirmPassword={confirmPassword}
      onPasswordChange={onPasswordChange}
      onConfirmPasswordChange={onConfirmPasswordChange}
      onSubmit={onSubmit}
      submitting={false}
      submitLabel="Salvar nova senha"
      error={error}
    />,
  )
  return { onPasswordChange, onConfirmPasswordChange, onSubmit }
}

const submit = () => screen.getByRole('button', { name: /salvar nova senha/i })

describe('ResetPasswordForm', () => {
  it('menos de 8 caracteres → erro', () => {
    renderForm('curta', '')
    expect(screen.getByText('A senha deve ter pelo menos 8 caracteres')).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('confirmação diferente → erro', () => {
    renderForm('senhaSegura1', 'senhaSegura2')
    expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('as duas certas → botão habilitado e o envio chama onSubmit', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm('senhaSegura1', 'senhaSegura1')

    expect(submit()).toBeEnabled()
    await user.click(submit())

    expect(onSubmit).toHaveBeenCalled()
  })

  it('usa PasswordInput: dá para mostrar a senha', async () => {
    const user = userEvent.setup()
    renderForm('senhaSegura1', 'senhaSegura1')
    const input = screen.getByLabelText(/^nova senha$/i)
    expect(input).toHaveAttribute('type', 'password')

    // Rótulo em inglês até indianous/base-ds#47
    await user.click(screen.getAllByRole('button', { name: /show password/i })[0])

    expect(input).toHaveAttribute('type', 'text')
  })

  it('mostra o erro vindo do servidor', () => {
    renderForm('senhaSegura1', 'senhaSegura1', 'Senha fraca demais')
    expect(screen.getByRole('alert')).toHaveTextContent('Senha fraca demais')
  })

  it('digitar repassa os valores', async () => {
    const user = userEvent.setup()
    const { onPasswordChange, onConfirmPasswordChange } = renderForm('', '')

    await user.type(screen.getByLabelText(/^nova senha$/i), 'a')
    await user.type(screen.getByLabelText(/confirmar/i), 'b')

    expect(onPasswordChange).toHaveBeenCalledWith('a')
    expect(onConfirmPasswordChange).toHaveBeenCalledWith('b')
  })
})
