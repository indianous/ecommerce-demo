import { Button, FileUpload, FormField, Icon } from 'base-ds'

interface Props {
  file: File | null
  onFileChange: (f: File | null) => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
}

export function PixQrCodeForm({ file, onFileChange, onSave, saving, saveLabel = 'Salvar' }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Novo QR Code do PIX (imagem)" id="pix-qr-upload">
        <FileUpload
          accept="image/png,image/jpeg,image/webp"
          onChange={([f]) => onFileChange(f ?? null)}
        />
      </FormField>

      {file && (
        <p className="text-sm text-muted-foreground">
          Arquivo selecionado: <span className="font-medium">{file.name}</span>
        </p>
      )}

      <div>
        <Button leftIcon={<Icon name="Save" size="sm" />} type="submit" variant="primary" disabled={!file} isLoading={saving}>{saveLabel}</Button>
      </div>
    </form>
  )
}
