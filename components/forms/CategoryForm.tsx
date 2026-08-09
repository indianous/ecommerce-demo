import { Button, FormField, Input } from 'base-ds'

interface Props {
  name: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
}

export function CategoryForm({ name, onChange, onSave, saving }: Props) {
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
        <Button type="submit" disabled={!name.trim() || saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
