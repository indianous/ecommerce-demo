import { Alert, Button, FormField, Icon, PasswordInput } from 'base-ds'
import { isValidPassword, passwordErrors } from '@/lib/password-policy'

interface Props {
  password: string
  confirmPassword: string
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
  submitLabel: string
  /** Erro devolvido pelo backend no envio. */
  error?: string
}

export function ResetPasswordForm({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  submitting,
  submitLabel,
  error,
}: Props) {
  const errors = passwordErrors(password, confirmPassword)
  const canSubmit = isValidPassword(password) && password === confirmPassword

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <FormField label="Nova senha" id="reset-password" error={errors.password} hint="Mínimo de 8 caracteres">
        <PasswordInput
          id="reset-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          disabled={submitting}
          autoComplete="new-password"
        />
      </FormField>

      <FormField label="Confirmar nova senha" id="reset-password-confirm" error={errors.confirm}>
        <PasswordInput
          id="reset-password-confirm"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          disabled={submitting}
          autoComplete="new-password"
        />
      </FormField>

      <div>
        <Button
          leftIcon={<Icon name="KeyRound" size="sm" />}
          type="submit"
          variant="primary"
          disabled={!canSubmit}
          isLoading={submitting}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
