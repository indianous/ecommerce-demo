import { FormField, Select, Text } from 'base-ds'
import { IconButton } from '@/components/ui/IconButton'
import type { StockLot, StockMovementReason } from '@/types'

interface Props {
  lots: StockLot[]
  reason: StockMovementReason
  lotId: string
  quantity: number
  note: string
  onReason: (v: StockMovementReason) => void
  onLotId: (v: string) => void
  onQuantity: (v: number) => void
  onNote: (v: string) => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
}

const EXIT_REASON_OPTIONS: { value: StockMovementReason; label: string }[] = [
  { value: 'LOSS_DAMAGE', label: 'Perda/Avaria' },
  { value: 'ADJUSTMENT', label: 'Ajuste' },
  { value: 'OTHER', label: 'Outro' },
]

function lotLabel(lot: StockLot): string {
  const parts = [lot.lotNumber ? `Lote ${lot.lotNumber}` : `Lote ${lot.id.slice(0, 8)}`]
  parts.push(`saldo ${lot.quantity}`)
  if (lot.expiryDate) parts.push(`vence ${lot.expiryDate}`)
  return parts.join(' — ')
}

export function StockExitForm({
  lots, reason, lotId, quantity, note,
  onReason, onLotId, onQuantity, onNote, onSave, saving,
  saveLabel = 'Salvar',
}: Props) {
  const selectedLot = lots.find((l) => l.id === lotId) ?? null
  const exceedsLotBalance = selectedLot != null && quantity > selectedLot.quantity
  const canSave = lotId !== '' && quantity > 0 && !exceedsLotBalance

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Motivo" id="stock-exit-reason">
        <Select
          id="stock-exit-reason"
          value={reason}
          onChange={(e) => onReason(e.target.value as StockMovementReason)}
          options={EXIT_REASON_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </FormField>

      <FormField label="Lote" id="stock-exit-lot">
        <Select
          id="stock-exit-lot"
          value={lotId}
          onChange={(e) => onLotId(e.target.value)}
          placeholder="Selecione um lote"
          options={lots.map((lot) => ({ value: lot.id, label: lotLabel(lot) }))}
        />
      </FormField>

      <FormField label="Quantidade" id="stock-exit-quantity">
        <input
          id="stock-exit-quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => onQuantity(Number(e.target.value))}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FormField>

      {exceedsLotBalance && (
        <Text size="sm" color="destructive">
          Quantidade maior que o saldo do lote selecionado ({selectedLot?.quantity}).
        </Text>
      )}

      <FormField label="Nota (opcional)" id="stock-exit-note">
        <input
          id="stock-exit-note"
          type="text"
          value={note}
          onChange={(e) => onNote(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FormField>

      <div>
        <IconButton type="submit" icon="Save" label={saveLabel} variant="primary" disabled={!canSave} isLoading={saving} />
      </div>
    </form>
  )
}
