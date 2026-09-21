import { Button, FormField, Icon, Input } from 'base-ds'

interface Props {
  name: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
}

export function CategoryForm({ name, onChange, onSave, saving, saveLabel = 'Salvar' }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Nome" id="category-name">
        <Input id="category-name" type="text" value={name} onChange={(e) => onChange(e.target.value)} />
      </FormField>

      <div>
        <Button leftIcon={<Icon name="Save" size="sm" />} type="submit" variant="primary" disabled={!name.trim()} isLoading={saving}>{saveLabel}</Button>
      </div>
    </form>
  )
}
