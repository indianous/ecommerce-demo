'use client'

import { Button, FileUpload, FormField, Icon } from 'base-ds'

interface Props {
  file: File | null
  onFileChange: (f: File | null) => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
}

export function PlaceholderImageForm({ file, onFileChange, onSave, saving, saveLabel = 'Salvar' }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Nova imagem de placeholder" id="placeholder-upload">
        <FileUpload
          accept="image/jpeg,image/png,image/webp"
          onChange={([f]) => onFileChange(f ?? null)}
        />
      </FormField>

      {file && (
        <p className="text-sm text-muted-foreground">
          Arquivo selecionado: <span className="font-medium">{file.name}</span>
        </p>
      )}

      <div>
        <Button iconOnly leftIcon={<Icon name="Save" size="sm" />} aria-label={saveLabel} type="submit" variant="primary" disabled={!file} isLoading={saving} />
      </div>
    </form>
  )
}
