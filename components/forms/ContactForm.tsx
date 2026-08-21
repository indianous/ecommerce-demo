import { Button, FormField, Icon, Input, Textarea } from 'base-ds'

interface Props {
  description: string
  phone: string
  email: string
  onDescription: (v: string) => void
  onPhone: (v: string) => void
  onEmail: (v: string) => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
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
      <FormField label="Descrição" id="contact-description">
        <Textarea
          id="contact-description"
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          rows={6}
          className="font-mono"
        />
      </FormField>

      <FormField label="Telefone" id="contact-phone">
        <Input id="contact-phone" type="tel" value={phone} onChange={(e) => onPhone(e.target.value)} />
      </FormField>

      <FormField label="E-mail de contato" id="contact-email">
        <Input id="contact-email" type="email" value={email} onChange={(e) => onEmail(e.target.value)} />
      </FormField>

      <div>
        <Button iconOnly leftIcon={<Icon name="Save" size="sm" />} aria-label={saveLabel} type="submit" variant="primary" isLoading={saving} />
      </div>
    </form>
  )
}
