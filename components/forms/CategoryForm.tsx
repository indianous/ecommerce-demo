import { Button, FormField } from 'base-ds'

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
        <input
          id="category-name"
          type="text"
          value={name}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FormField>

      <div>
        <Button type="submit" disabled={!name.trim() || saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
