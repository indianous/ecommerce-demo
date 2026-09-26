import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_EMPLOYEE_FORM, EmployeeForm, toEmployeeInput, type EmployeeFormState } from '../EmployeeForm'

const valid: EmployeeFormState = { ...EMPTY_EMPLOYEE_FORM, name: 'Ana Costa', email: 'ana@test.com' }

function renderForm(value: Partial<EmployeeFormState> = {}) {
  const onChange = vi.fn()
  const onSave = vi.fn()
  const onCancel = vi.fn()
  render(<EmployeeForm value={{ ...valid, ...value }} onChange={onChange} onSave={onSave} onCancel={onCancel} saving={false} />)
  return { onChange, onSave, onCancel }
}

const save = () => screen.getByRole('button', { name: /salvar/i })

describe('EmployeeForm', () => {
  it('convite ligado por padrão: sem campo de senha, e nome + e-mail bastam', () => {
    renderForm()
    expect(screen.getByRole('switch', { name: /enviar convite para criar senha/i })).toBeChecked()
    expect(screen.queryByLabelText(/^senha$/i)).not.toBeInTheDocument()
    expect(save()).toBeEnabled()
  })

  it('nome ou e-mail faltando → desabilitado; e-mail inválido → erro', () => {
    renderForm({ name: '' })
    expect(save()).toBeDisabled()
  })

  it('e-mail inválido → erro', () => {
    renderForm({ email: 'ana@' })
    expect(screen.getByText(/e-mail inválido/i)).toBeInTheDocument()
    expect(save()).toBeDisabled()
  })

  it('convite desligado mostra a senha, que passa a exigir 8 caracteres', () => {
    renderForm({ sendInvite: false, password: 'curta' })
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument()
    expect(screen.getByText('A senha deve ter pelo menos 8 caracteres')).toBeInTheDocument()
    expect(save()).toBeDisabled()
  })

  it('convite desligado com senha válida → habilitado', () => {
    renderForm({ sendInvite: false, password: 'senhaSegura1' })
    expect(save()).toBeEnabled()
  })

  it('é puro: alternar o convite e digitar repassam o patch', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm()

    await user.click(screen.getByRole('switch', { name: /enviar convite para criar senha/i }))
    await user.type(screen.getByLabelText(/nome/i), 'x')

    expect(onChange).toHaveBeenCalledWith({ sendInvite: false })
    expect(onChange).toHaveBeenCalledWith({ name: 'Ana Costax' })
  })

  it('salvar e cancelar chamam os handlers', async () => {
    const user = userEvent.setup()
    const { onSave, onCancel } = renderForm()

    await user.click(save())
    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(onSave).toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })

  it('toEmployeeInput: com convite não manda senha; sem convite manda', () => {
    expect(toEmployeeInput({ ...valid, password: 'ignorada1' })).toEqual({ name: 'Ana Costa', email: 'ana@test.com' })
    expect(toEmployeeInput({ ...valid, sendInvite: false, password: 'senhaSegura1' }))
      .toEqual({ name: 'Ana Costa', email: 'ana@test.com', password: 'senhaSegura1' })
  })
})
