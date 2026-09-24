import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_QUICK_CUSTOMER, QuickCustomerForm, type QuickCustomerFormState } from '../QuickCustomerForm'

const valid: QuickCustomerFormState = { ...EMPTY_QUICK_CUSTOMER, name: 'Ana Souza', email: 'ana@test.com' }

function renderForm(form: Partial<QuickCustomerFormState> = {}) {
  const onChange = vi.fn()
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
  render(<QuickCustomerForm form={{ ...valid, ...form }} onChange={onChange} onSubmit={onSubmit} saving={false} />)
  return { onChange, onSubmit }
}

const submit = () => screen.getByRole('button', { name: /cadastrar cliente/i })

describe('QuickCustomerForm', () => {
  it('nome e e-mail válidos, telefone e CPF vazios → botão habilitado', () => {
    renderForm()
    expect(submit()).toBeEnabled()
  })

  it('sem nome ou sem e-mail → botão desabilitado', () => {
    renderForm({ name: '' })
    expect(submit()).toBeDisabled()
  })

  it('e-mail inválido → erro', () => {
    renderForm({ email: 'ana@' })
    expect(screen.getByText(/e-mail inválido/i)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('CPF com dígito verificador errado → erro', () => {
    renderForm({ cpf: '529.982.247-24' })
    expect(screen.getByText(/cpf inválido/i)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('CPF válido com máscara é aceito', () => {
    renderForm({ cpf: '529.982.247-25' })
    expect(screen.queryByText(/cpf inválido/i)).not.toBeInTheDocument()
    expect(submit()).toBeEnabled()
  })

  it('digitar repassa o campo alterado', async () => {
    const user = userEvent.setup()
    const { onChange } = renderForm({ phone: '' })

    await user.type(screen.getByLabelText(/telefone/i), '1')

    expect(onChange).toHaveBeenCalledWith({ phone: '1' })
  })
})
