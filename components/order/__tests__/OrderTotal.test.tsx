import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OrderTotal } from '../OrderTotal'

describe('OrderTotal', () => {
  it('com desconto, mostra o total e a linha do cupom', () => {
    render(<OrderTotal totalAmount={180} discountAmount={20} couponCode="DEZ" />)

    expect(screen.getByText(/R\$\s*180,00/)).toBeInTheDocument()
    expect(screen.getByText(/desconto \(DEZ\): −\s*R\$\s*20,00/i)).toBeInTheDocument()
  })

  it('sem desconto, só o total', () => {
    render(<OrderTotal totalAmount={100} discountAmount={0} couponCode={null} />)

    expect(screen.getByText(/R\$\s*100,00/)).toBeInTheDocument()
    expect(screen.queryByText(/desconto/i)).not.toBeInTheDocument()
  })

  it('pedido antigo sem os campos de desconto: só o total', () => {
    render(<OrderTotal totalAmount={100} />)

    expect(screen.queryByText(/desconto/i)).not.toBeInTheDocument()
  })
})
