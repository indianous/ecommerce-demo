'use client'

import { Button, FileUpload, FormField, Icon } from 'base-ds'

interface Props {
  file: File | null
  onFileChange: (f: File | null) => void
  onConfirm: () => void
  onCancel: () => void
  confirming: boolean
}

export function PaymentConfirmForm({ file, onFileChange, onConfirm, onCancel, confirming }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onConfirm()
      }}
      className="flex flex-col gap-6"
    >
      <FormField label="Comprovante de pagamento" id="payment-receipt">
        <FileUpload
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          onChange={([f]) => onFileChange(f ?? null)}
        />
      </FormField>

      {file && (
        <p className="text-sm text-muted-foreground">
          Arquivo selecionado: <span className="font-medium">{file.name}</span>
        </p>
      )}

      <div className="flex gap-3">
        <Button iconOnly leftIcon={<Icon name="Check" size="sm" />} aria-label="Confirmar pagamento" type="submit" variant="primary" disabled={!file} isLoading={confirming} />
        <Button iconOnly leftIcon={<Icon name="X" size="sm" />} aria-label="Cancelar" type="button" variant="secondary" onClick={onCancel} disabled={confirming} />
      </div>
    </form>
  )
}
