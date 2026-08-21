import { Button, FormField, Icon, Textarea } from 'base-ds'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
}

export function MarkdownContentForm({ label, value, onChange, onSave, saving, saveLabel = 'Salvar' }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label={label} id="markdown-content">
        <Textarea
          id="markdown-content"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          className="font-mono"
        />
      </FormField>

      <div>
        <Button iconOnly leftIcon={<Icon name="Save" size="sm" />} aria-label={saveLabel} type="submit" variant="primary" isLoading={saving} />
      </div>
    </form>
  )
}
