import { Button, FormField } from 'base-ds'

interface Props {
  siteTitle: string
  defaultDescription: string
  onSiteTitle: (v: string) => void
  onDefaultDescription: (v: string) => void
  onSave: () => void
  saving: boolean
}

export function SiteMetadataForm({
  siteTitle,
  defaultDescription,
  onSiteTitle,
  onDefaultDescription,
  onSave,
  saving,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Nome da loja" id="site-title">
        <input
          id="site-title"
          type="text"
          value={siteTitle}
          onChange={(e) => onSiteTitle(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FormField>

      <FormField label="Descrição padrão" id="default-description">
        <textarea
          id="default-description"
          value={defaultDescription}
          onChange={(e) => onDefaultDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FormField>

      <div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
