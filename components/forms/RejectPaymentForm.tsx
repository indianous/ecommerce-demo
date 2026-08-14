'use client'

import { FormField } from 'base-ds'
import { IconButton } from '@/components/ui/IconButton'

interface Props {
  reason: string
  onReasonChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  submitting: boolean
}

export function RejectPaymentForm({ reason, onReasonChange, onSubmit, onCancel, submitting }: Props) {
  const isValid = reason.trim().length > 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (isValid) onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Motivo da rejeição" id="rejection-reason">
        <textarea
          id="rejection-reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Explique por que o comprovante foi rejeitado"
        />
      </FormField>

      <div className="flex gap-3">
        <IconButton
          type="submit"
          icon="Ban"
          label="Confirmar rejeição"
          variant="danger"
          disabled={!isValid}
          isLoading={submitting}
        />
        <IconButton type="button" icon="X" label="Cancelar" variant="secondary" onClick={onCancel} disabled={submitting} />
      </div>
    </form>
  )
}
