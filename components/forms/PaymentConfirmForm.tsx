'use client'

import { Button, FileUpload, FormField, Icon } from 'base-ds'

interface Props {
  file: File | null
  onFileChange: (f: File | null) => void
  onConfirm: () => void
  onCancel: () => void
  confirming: boolean
  /** Pagar na retirada não exige comprovante (a equipe recebe no balcão). */
  receiptRequired?: boolean
}

export function PaymentConfirmForm({
  file,
  onFileChange,
  onConfirm,
  onCancel,
  confirming,
  receiptRequired = true,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onConfirm()
      }}
      className="flex flex-col gap-6"
    >
      <FormField label={receiptRequired ? 'Comprovante de pagamento' : 'Comprovante de pagamento (opcional)'} id="payment-receipt">
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
        <Button leftIcon={<Icon name="Check" size="sm" />} type="submit" variant="primary" disabled={receiptRequired && !file} isLoading={confirming}>Confirmar pagamento</Button>
        <Button leftIcon={<Icon name="X" size="sm" />} type="button" variant="secondary" onClick={onCancel} disabled={confirming}>Cancelar</Button>
      </div>
    </form>
  )
}
