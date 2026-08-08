import { Button, FormField } from 'base-ds'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
}

export function MarkdownContentForm({ label, value, onChange, onSave, saving }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label={label} id="markdown-content">
        <textarea
          id="markdown-content"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
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
