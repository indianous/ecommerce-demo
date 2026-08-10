import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PaymentGatewayForm } from '../PaymentGatewayForm'
import type { PaymentGatewayConfig } from '@/types'

const config: PaymentGatewayConfig = {
  active: 'MOCK',
  available: [
    { provider: 'MOCK', configured: true },
    { provider: 'STRIPE', configured: true },
    { provider: 'PAGSEGURO', configured: false },
  ],
}

describe('PaymentGatewayForm', () => {
  it('renderiza as 3 opções, marcando a ativa atual', () => {
    render(
      <PaymentGatewayForm config={config} value="MOCK" onChange={vi.fn()} onSave={vi.fn()} saving={false} />,
    )

    expect(screen.getByRole('radio', { name: /mock/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /stripe/i })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /pagseguro/i })).toBeInTheDocument()
  })

  it('opção com configured:false aparece desabilitada, com aviso', () => {
    render(
      <PaymentGatewayForm config={config} value="MOCK" onChange={vi.fn()} onSave={vi.fn()} saving={false} />,
    )

    expect(screen.getByRole('radio', { name: /pagseguro/i })).toBeDisabled()
    expect(screen.getByText(/credenciais não configuradas/i)).toBeInTheDocument()
  })

  it('selecionar uma opção configurada chama onChange com o provider', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <PaymentGatewayForm config={config} value="MOCK" onChange={onChange} onSave={vi.fn()} saving={false} />,
    )

    await user.click(screen.getByRole('radio', { name: /stripe/i }))

    expect(onChange).toHaveBeenCalledWith('STRIPE')
  })

  it('confirmar chama onSave', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(
      <PaymentGatewayForm config={config} value="STRIPE" onChange={vi.fn()} onSave={onSave} saving={false} />,
    )

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('erro vindo do pai é exibido', () => {
    render(
      <PaymentGatewayForm
        config={config}
        value="MOCK"
        onChange={vi.fn()}
        onSave={vi.fn()}
        saving={false}
        error="Gateway sem credenciais configuradas"
      />,
    )

    expect(screen.getByText(/gateway sem credenciais configuradas/i)).toBeInTheDocument()
  })
})
