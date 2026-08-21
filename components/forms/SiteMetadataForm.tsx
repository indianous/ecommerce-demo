import { Button, FormField, Icon, Input, Textarea } from 'base-ds'

interface Props {
  siteTitle: string
  defaultDescription: string
  onSiteTitle: (v: string) => void
  onDefaultDescription: (v: string) => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
}

export function SiteMetadataForm({
  siteTitle,
  defaultDescription,
  onSiteTitle,
  onDefaultDescription,
  onSave,
  saving,
  saveLabel = 'Salvar',
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
        <Input id="site-title" type="text" value={siteTitle} onChange={(e) => onSiteTitle(e.target.value)} />
      </FormField>

      <FormField label="Descrição padrão" id="default-description">
        <Textarea
          id="default-description"
          value={defaultDescription}
          onChange={(e) => onDefaultDescription(e.target.value)}
          rows={3}
        />
      </FormField>

      <div>
        <Button iconOnly leftIcon={<Icon name="Save" size="sm" />} aria-label={saveLabel} type="submit" variant="primary" isLoading={saving} />
      </div>
    </form>
  )
}
