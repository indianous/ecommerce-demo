import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StockEntryForm } from '../StockEntryForm'

function renderForm(overrides: Partial<React.ComponentProps<typeof StockEntryForm>> = {}) {
  const props: React.ComponentProps<typeof StockEntryForm> = {
    reason: 'PURCHASE',
    quantity: 1,
    note: '',
    lotNumber: '',
    expiryDate: '',
    onReason: vi.fn(),
    onQuantity: vi.fn(),
    onNote: vi.fn(),
    onLotNumber: vi.fn(),
    onExpiryDate: vi.fn(),
    onSave: vi.fn(),
    saving: false,
    ...overrides,
  }
  return { ...render(<StockEntryForm {...props} />), props }
}

describe('StockEntryForm', () => {
  it('renderiza motivo limitado às opções de entrada', () => {
    renderForm()
    const select = screen.getByLabelText(/motivo/i) as HTMLSelectElement
    const optionLabels = Array.from(select.options).map((o) => o.textContent)
    expect(optionLabels).toEqual(expect.arrayContaining(['Compra', 'Devolução', 'Ajuste', 'Outro']))
    expect(optionLabels).not.toContain('Perda/Avaria')
  });

  it('lote e validade são opcionais — botão salvar habilitado sem preenchê-los', () => {
    renderForm({ quantity: 10 });
    expect(screen.getByRole('button', { name: /salvar/i })).not.toBeDisabled();
  });

  it('chama onSave ao submeter', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderForm({ quantity: 5, onSave });

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
