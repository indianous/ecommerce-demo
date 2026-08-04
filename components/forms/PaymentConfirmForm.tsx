'use client'

import { Button, FileUpload, FormField } from 'base-ds'

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
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={([f]) => onFileChange(f ?? null)}
        />
      </FormField>

      {file && (
        <p className="text-sm text-muted-foreground">
          Arquivo selecionado: <span className="font-medium">{file.name}</span>
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={!file || confirming}>
          Confirmar pagamento
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={confirming}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
