import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProfileDataForm, isValidCpf } from '../ProfileDataForm'

function renderForm(overrides: Partial<React.ComponentProps<typeof ProfileDataForm>> = {}) {
  const props: React.ComponentProps<typeof ProfileDataForm> = {
    name: 'João Silva',
    email: 'joao@test.com',
    phone: '',
    birthDate: '',
    gender: 'PREFIRO_NAO_DIZER',
    cpf: '',
    onNameChange: vi.fn(),
    onEmailChange: vi.fn(),
    onPhoneChange: vi.fn(),
    onBirthDateChange: vi.fn(),
    onGenderChange: vi.fn(),
    onCpfChange: vi.fn(),
    onSubmit: vi.fn((e) => e.preventDefault()),
    saving: false,
    ...overrides,
  }
  return { props, ...render(<ProfileDataForm {...props} />) }
}

describe('isValidCpf', () => {
  it('valida um CPF com dígitos verificadores corretos', () => {
    expect(isValidCpf('11144477735')).toBe(true)
  })

  it('rejeita um CPF com dígito verificador inválido', () => {
    expect(isValidCpf('11144477736')).toBe(false)
  })

  it('rejeita um CPF com todos os dígitos iguais', () => {
    expect(isValidCpf('11111111111')).toBe(false)
  })
})

describe('ProfileDataForm', () => {
  it('renders phone, birth date, gender and cpf fields', () => {
    renderForm()

    expect(screen.getByLabelText(/telefone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/data de nascimento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/gênero/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^cpf$/i)).toBeInTheDocument()
  })

  it('blocks submit and shows an error when cpf is filled but invalid', async () => {
    const user = userEvent.setup()
    const { props } = renderForm({ cpf: '11144477736' })

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(screen.getByText(/cpf inválido/i)).toBeInTheDocument()
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('submits normally when cpf is valid', async () => {
    const user = userEvent.setup()
    const { props } = renderForm({ cpf: '11144477735' })

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('submits normally when cpf is empty', async () => {
    const user = userEvent.setup()
    const { props } = renderForm({ cpf: '' })

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('blocks submit and shows an error when birth date is in the future', async () => {
    const user = userEvent.setup()
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10)
    const { props } = renderForm({ birthDate: futureDate })

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(screen.getByText(/data de nascimento não pode ser no futuro/i)).toBeInTheDocument()
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('submits normally when birth date is in the past', async () => {
    const user = userEvent.setup()
    const { props } = renderForm({ birthDate: '1996-03-20' })

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('submits normally when birth date is empty', async () => {
    const user = userEvent.setup()
    const { props } = renderForm({ birthDate: '' })

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('ProfileDataForm — troca de e-mail (plano 64)', () => {
  const HINT = 'Você vai precisar confirmar o novo e-mail antes do próximo pedido'

  it('e-mail igual ao atual → sem dica', () => {
    renderForm({ originalEmail: 'joao@test.com' })
    expect(screen.queryByText(HINT)).not.toBeInTheDocument()
  })

  it('e-mail diferente do atual → dica de confirmação', () => {
    renderForm({ email: 'joao.novo@test.com', originalEmail: 'joao@test.com' })
    expect(screen.getByText(HINT)).toBeInTheDocument()
  })
})

