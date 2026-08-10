import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StockExitForm } from '../StockExitForm'
import type { StockLot } from '@/types'

const lots: StockLot[] = [
  { id: 'lot-1', productId: 'prod-1', productName: 'Produto', lotNumber: 'L1', quantity: 5, initialQuantity: 10, createdAt: '2026-01-01T00:00:00' },
  { id: 'lot-2', productId: 'prod-1', productName: 'Produto', lotNumber: 'L2', quantity: 20, initialQuantity: 20, createdAt: '2026-01-01T00:00:00', expiryDate: '2026-12-31' },
]

function renderForm(overrides: Partial<React.ComponentProps<typeof StockExitForm>> = {}) {
  const props: React.ComponentProps<typeof StockExitForm> = {
    lots,
    reason: 'LOSS_DAMAGE',
    lotId: '',
    quantity: 1,
    note: '',
    onReason: vi.fn(),
    onLotId: vi.fn(),
    onQuantity: vi.fn(),
    onNote: vi.fn(),
    onSave: vi.fn(),
    saving: false,
    ...overrides,
  }
  return render(<StockExitForm {...props} />)
}

describe('StockExitForm', () => {
  it('lista os lotes recebidos via prop, sem lote selecionado botão desabilitado', () => {
    renderForm()
    expect(screen.getByText(/L1/)).toBeInTheDocument()
    expect(screen.getByText(/L2/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('motivo limitado às opções de saída', () => {
    renderForm()
    const select = screen.getByLabelText(/^motivo$/i) as HTMLSelectElement
    const optionLabels = Array.from(select.options).map((o) => o.textContent)
    expect(optionLabels).toEqual(expect.arrayContaining(['Perda/Avaria', 'Ajuste', 'Outro']))
    expect(optionLabels).not.toContain('Compra')
  })

  it('quantidade maior que o saldo do lote selecionado mostra erro local e desabilita salvar', () => {
    renderForm({ lotId: 'lot-1', quantity: 999 })
    expect(screen.getByText(/saldo do lote/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('quantidade dentro do saldo habilita salvar e chama onSave', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    renderForm({ lotId: 'lot-2', quantity: 5, onSave })

    const button = screen.getByRole('button', { name: /salvar/i })
    expect(button).not.toBeDisabled()
    await user.click(button)

    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
