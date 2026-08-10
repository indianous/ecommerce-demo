import { Button, FormField, Select } from 'base-ds'
import type { StockMovementReason } from '@/types'

interface Props {
  reason: StockMovementReason
  quantity: number
  note: string
  lotNumber: string
  expiryDate: string
  onReason: (v: StockMovementReason) => void
  onQuantity: (v: number) => void
  onNote: (v: string) => void
  onLotNumber: (v: string) => void
  onExpiryDate: (v: string) => void
  onSave: () => void
  saving: boolean
}

const ENTRY_REASON_OPTIONS: { value: StockMovementReason; label: string }[] = [
  { value: 'PURCHASE', label: 'Compra' },
  { value: 'RETURN', label: 'Devolução' },
  { value: 'ADJUSTMENT', label: 'Ajuste' },
  { value: 'OTHER', label: 'Outro' },
]

export function StockEntryForm({
  reason, quantity, note, lotNumber, expiryDate,
  onReason, onQuantity, onNote, onLotNumber, onExpiryDate, onSave, saving,
}: Props) {
  const canSave = quantity > 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Motivo" id="stock-entry-reason">
        <Select
          id="stock-entry-reason"
          value={reason}
          onChange={(e) => onReason(e.target.value as StockMovementReason)}
          options={ENTRY_REASON_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </FormField>

      <FormField label="Quantidade" id="stock-entry-quantity">
        <input
          id="stock-entry-quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => onQuantity(Number(e.target.value))}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FormField>

      <FormField label="Número do lote (opcional)" id="stock-entry-lot-number">
        <input
          id="stock-entry-lot-number"
          type="text"
          value={lotNumber}
          onChange={(e) => onLotNumber(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FormField>

      <FormField label="Validade (opcional)" id="stock-entry-expiry">
        <input
          id="stock-entry-expiry"
          type="date"
          value={expiryDate}
          onChange={(e) => onExpiryDate(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FormField>

      <FormField label="Nota (opcional)" id="stock-entry-note">
        <input
          id="stock-entry-note"
          type="text"
          value={note}
          onChange={(e) => onNote(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FormField>

      <div>
        <Button type="submit" disabled={!canSave || saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
