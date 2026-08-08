import { Button, FormField } from 'base-ds'

interface Props {
  description: string
  phone: string
  email: string
  onDescription: (v: string) => void
  onPhone: (v: string) => void
  onEmail: (v: string) => void
  onSave: () => void
  saving: boolean
}

export function ContactForm({
  description,
  phone,
  email,
  onDescription,
  onPhone,
  onEmail,
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
      <FormField label="Descrição" id="contact-description">
        <textarea
          id="contact-description"
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          rows={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FormField>

      <FormField label="Telefone" id="contact-phone">
        <input
          id="contact-phone"
          type="tel"
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FormField>

      <FormField label="E-mail de contato" id="contact-email">
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
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
