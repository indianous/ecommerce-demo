import { Alert, Button, FormField, Icon, PasswordInput, PinInput } from '@indianous/base-ds'

interface Props {
  password: string
  code: string
  onPasswordChange: (value: string) => void
  onCodeChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  submitting: boolean
  error?: string
}

/** Desativar o 2FA (só cliente): a senha e um código do app, para ninguém desligar com a sessão aberta. */
export function MfaDisableForm({
  password,
  code,
  onPasswordChange,
  onCodeChange,
  onSubmit,
  onCancel,
  submitting,
  error,
}: Props) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && <Alert variant="danger">{error}</Alert>}

      <FormField label="Senha" id="mfa-disable-password">
        <PasswordInput
          id="mfa-disable-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          disabled={submitting}
          autoComplete="current-password"
        />
      </FormField>

      <FormField label="Código do app autenticador" id="mfa-disable-code">
        <PinInput length={6} value={code} onChange={onCodeChange} disabled={submitting} />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="danger"
          leftIcon={<Icon name="ShieldOff" size="sm" />}
          isLoading={submitting}
          disabled={!password || code.length !== 6}
        >
          Desativar
        </Button>
      </div>
    </form>
  )
}
