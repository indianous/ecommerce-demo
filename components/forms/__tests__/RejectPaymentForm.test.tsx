import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RejectPaymentForm } from '../RejectPaymentForm'

type Overrides = Partial<{
  reason: string
  onReasonChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  submitting: boolean
}>

function renderForm(overrides: Overrides = {}) {
  const props = {
    reason: '',
    onReasonChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    submitting: false,
    ...overrides,
  }
  render(<RejectPaymentForm {...props} />)
  return props
}

describe('RejectPaymentForm', () => {
  it('renderiza o campo de motivo e os botões', () => {
    renderForm()
    expect(screen.getByLabelText(/motivo da rejeição/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmar rejeição/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('botão "Confirmar rejeição" desabilitado com motivo vazio', () => {
    renderForm({ reason: '' })
    expect(screen.getByRole('button', { name: /confirmar rejeição/i })).toBeDisabled()
  })

  it('botão "Confirmar rejeição" desabilitado com motivo só espaços', () => {
    renderForm({ reason: '   ' })
    expect(screen.getByRole('button', { name: /confirmar rejeição/i })).toBeDisabled()
  })

  it('botão "Confirmar rejeição" habilitado com motivo preenchido', () => {
    renderForm({ reason: 'Comprovante ilegível' })
    expect(screen.getByRole('button', { name: /confirmar rejeição/i })).toBeEnabled()
  })

  it('chama onReasonChange ao digitar no textarea', async () => {
    const onReasonChange = vi.fn()
    renderForm({ onReasonChange })
    await userEvent.type(screen.getByLabelText(/motivo da rejeição/i), 'x')
    expect(onReasonChange).toHaveBeenCalledWith('x')
  })

  it('chama onSubmit ao clicar em "Confirmar rejeição" com motivo válido', async () => {
    const onSubmit = vi.fn()
    renderForm({ reason: 'Comprovante ilegível', onSubmit })
    await userEvent.click(screen.getByRole('button', { name: /confirmar rejeição/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('chama onCancel ao clicar em "Cancelar" sem chamar onSubmit', async () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    renderForm({ reason: 'Comprovante ilegível', onSubmit, onCancel })
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('desabilita os dois botões quando submitting=true', () => {
    renderForm({ reason: 'Comprovante ilegível', submitting: true })
    expect(screen.getByRole('button', { name: /confirmar rejeição/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled()
  })
})
