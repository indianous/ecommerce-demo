'use client'

import { Button, FormField, Icon, Textarea } from 'base-ds'

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
        <Textarea
          id="rejection-reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={4}
          placeholder="Explique por que o comprovante foi rejeitado"
        />
      </FormField>

      <div className="flex gap-3">
        <Button iconOnly leftIcon={<Icon name="Ban" size="sm" />} aria-label="Confirmar rejeição" type="submit" variant="danger" disabled={!isValid} isLoading={submitting} />
        <Button iconOnly leftIcon={<Icon name="X" size="sm" />} aria-label="Cancelar" type="button" variant="secondary" onClick={onCancel} disabled={submitting} />
      </div>
    </form>
  )
}
