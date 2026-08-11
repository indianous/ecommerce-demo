'use client'

import { Button, FileUpload, FormField } from 'base-ds'

interface Props {
  file: File | null
  onFileChange: (f: File | null) => void
  onSave: () => void
  saving: boolean
}

export function FaviconForm({ file, onFileChange, onSave, saving }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Novo favicon" id="favicon-upload">
        <FileUpload
          accept=".ico,image/x-icon,image/vnd.microsoft.icon,.png,image/png,.svg,image/svg+xml"
          onChange={([f]) => onFileChange(f ?? null)}
        />
      </FormField>

      {file && (
        <p className="text-sm text-muted-foreground">
          Arquivo selecionado: <span className="font-medium">{file.name}</span>
        </p>
      )}

      <div>
        <Button type="submit" disabled={!file || saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
