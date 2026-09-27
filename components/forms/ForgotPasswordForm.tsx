import { Button, FormField, Icon, Input } from '@indianous/base-ds'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  email: string
  onEmailChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
}

export function ForgotPasswordForm({ email, onEmailChange, onSubmit, submitting }: Props) {
  const trimmed = email.trim()
  const emailError = trimmed && !EMAIL.test(trimmed) ? 'E-mail inválido' : undefined

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField label="E-mail" id="forgot-email" error={emailError}>
        <Input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={submitting}
          autoComplete="email"
        />
      </FormField>
      <div>
        <Button
          leftIcon={<Icon name="Mail" size="sm" />}
          type="submit"
          variant="primary"
          disabled={!trimmed || !!emailError}
          isLoading={submitting}
        >
          Enviar link
        </Button>
      </div>
    </form>
  )
}
