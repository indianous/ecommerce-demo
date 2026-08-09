import { Button, FileUpload, FormField, Input } from 'base-ds'

interface Props {
  file: File | null
  linkUrl: string
  onFileChange: (f: File | null) => void
  onLinkUrl: (v: string) => void
  onSave: () => void
  saving: boolean
}

export function BannerForm({ file, linkUrl, onFileChange, onLinkUrl, onSave, saving }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Imagem do banner" id="banner-upload">
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

      <FormField label="Link do banner" id="banner-link">
        <Input
          id="banner-link"
          type="url"
          value={linkUrl}
          onChange={(e) => onLinkUrl(e.target.value)}
          placeholder="https://..."
        />
      </FormField>

      <div>
        <Button type="submit" disabled={!file || saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
