import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProfileDataForm } from '../ProfileDataForm'

function renderForm(overrides: Partial<React.ComponentProps<typeof ProfileDataForm>> = {}) {
  const props: React.ComponentProps<typeof ProfileDataForm> = {
    name: 'João Silva',
    email: 'joao@test.com',
    phone: '',
    birthDate: '',
    gender: 'PREFIRO_NAO_DIZER',
    onNameChange: vi.fn(),
    onEmailChange: vi.fn(),
    onPhoneChange: vi.fn(),
    onBirthDateChange: vi.fn(),
    onGenderChange: vi.fn(),
    onSubmit: vi.fn((e) => e.preventDefault()),
    saving: false,
    ...overrides,
  }
  return { props, ...render(<ProfileDataForm {...props} />) }
}

describe('ProfileDataForm', () => {
  it('renders phone, birth date and gender fields', () => {
    renderForm()

    expect(screen.getByLabelText(/telefone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/data de nascimento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/gênero/i)).toBeInTheDocument()
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
