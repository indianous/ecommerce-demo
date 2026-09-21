import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PaymentConfirmForm } from '../PaymentConfirmForm'

function renderForm(props: Partial<React.ComponentProps<typeof PaymentConfirmForm>> = {}) {
  const onConfirm = vi.fn()
  render(
    <PaymentConfirmForm file={null} onFileChange={vi.fn()} onConfirm={onConfirm} onCancel={vi.fn()} confirming={false} {...props} />,
  )
  return { onConfirm }
}

describe('PaymentConfirmForm', () => {
  it('por padrão o comprovante é obrigatório: sem arquivo o botão fica desabilitado', () => {
    renderForm()

    expect(screen.getByRole('button', { name: /confirmar pagamento/i })).toBeDisabled()
  })

  it('com arquivo, habilita e confirma', async () => {
    const { onConfirm } = renderForm({ file: new File(['x'], 'comprovante.pdf') })

    await userEvent.click(screen.getByRole('button', { name: /confirmar pagamento/i }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('com receiptRequired=false (pagar na retirada) o botão fica habilitado sem arquivo', async () => {
    const { onConfirm } = renderForm({ receiptRequired: false })

    const button = screen.getByRole('button', { name: /confirmar pagamento/i })
    expect(button).toBeEnabled()
    await userEvent.click(button)

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('com receiptRequired=false o campo do comprovante é opcional (rótulo indica)', () => {
    renderForm({ receiptRequired: false })

    expect(screen.getByText(/comprovante de pagamento \(opcional\)/i)).toBeInTheDocument()
  })
})
