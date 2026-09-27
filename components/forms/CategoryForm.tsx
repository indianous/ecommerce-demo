import { Button, FormField, Icon, Input, Textarea } from '@indianous/base-ds'

export type CategoryFormState = {
  name: string
  slug: string
  description: string
}

export const EMPTY_CATEGORY_FORM: CategoryFormState = { name: '', slug: '', description: '' }

interface Props {
  form: CategoryFormState
  onFormChange: (patch: Partial<CategoryFormState>) => void
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
  /** Na edição, a dica do slug avisa que trocá-lo quebra os links do catálogo já compartilhados. */
  editing?: boolean
  saveLabel?: string
}

export function CategoryForm({ form, onFormChange, onSubmit, saving, editing = false, saveLabel = 'Salvar' }: Props) {
  const slugHint = editing
    ? 'Deixe em branco para gerar a partir do nome. O filtro do catálogo usa o slug na URL: trocá-lo quebra links já compartilhados.'
    : 'Deixe em branco para gerar a partir do nome.'

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField label="Nome" id="category-name">
        <Input id="category-name" value={form.name} onChange={(e) => onFormChange({ name: e.target.value })} maxLength={100} />
      </FormField>
      <FormField label="Slug" id="category-slug" hint={slugHint}>
        <Input
          id="category-slug"
          value={form.slug}
          onChange={(e) => onFormChange({ slug: e.target.value })}
          placeholder="gerado-a-partir-do-nome"
          maxLength={100}
        />
      </FormField>
      <FormField label="Descrição" id="category-description">
        <Textarea
          id="category-description"
          value={form.description}
          onChange={(e) => onFormChange({ description: e.target.value })}
          rows={3}
        />
      </FormField>
      <div>
        <Button leftIcon={<Icon name="Save" size="sm" />} type="submit" variant="primary" disabled={!form.name.trim()} isLoading={saving}>
          {saveLabel}
        </Button>
      </div>
    </form>
  )
}
