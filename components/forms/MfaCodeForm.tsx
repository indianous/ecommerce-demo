import { Alert, Button, FormField, Icon, Input, PinInput, Text } from 'base-ds'

interface Props {
  mode: 'code' | 'recovery'
  code: string
  recoveryCode: string
  onCodeChange: (value: string) => void
  onRecoveryCodeChange: (value: string) => void
  /** Envia o código completo: sozinho ao preencher os 6 dígitos, ou pelo botão no modo recuperação. */
  onSubmit: (value: string) => void
  /** Sem ele (configuração do app), o código de recuperação não é oferecido. */
  onToggleMode?: () => void
  submitting: boolean
  submitLabel?: string
  error?: string
  attemptsRemaining?: number
}

const RECOVERY_CODE_LENGTH = 8

/** Maiúsculas, só letras e números, hífen depois do quarto caractere: "abcd efgh" → "ABCD-EFGH". */
export function formatRecoveryCode(input: string): string {
  const raw = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, RECOVERY_CODE_LENGTH)
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw
}

function attemptsText(remaining: number) {
  return remaining === 1 ? '1 tentativa restante' : `${remaining} tentativas restantes`
}

/** Código do app autenticador (6 dígitos) ou código de recuperação (XXXX-XXXX). */
export function MfaCodeForm({
  mode,
  code,
  recoveryCode,
  onCodeChange,
  onRecoveryCodeChange,
  onSubmit,
  onToggleMode,
  submitting,
  submitLabel = 'Entrar',
  error,
  attemptsRemaining,
}: Props) {
  const recoveryComplete = recoveryCode.replace('-', '').length === RECOVERY_CODE_LENGTH

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'recovery' && recoveryComplete) onSubmit(recoveryCode)
    if (mode === 'code' && code.length === 6) onSubmit(code)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error && (
        <Alert variant="danger">
          <Text>{error}</Text>
          {attemptsRemaining !== undefined && <Text size="sm">{attemptsText(attemptsRemaining)}</Text>}
        </Alert>
      )}

      {mode === 'code' ? (
        <FormField label="Código de 6 dígitos" id="mfa-code" hint="O código muda a cada 30 segundos">
          <PinInput
            length={6}
            value={code}
            onChange={onCodeChange}
            onComplete={onSubmit}
            disabled={submitting}
          />
        </FormField>
      ) : (
        <>
          <FormField label="Código de recuperação" id="mfa-recovery-code" hint="Um dos códigos que você guardou, no formato XXXX-XXXX">
            <Input
              id="mfa-recovery-code"
              value={recoveryCode}
              onChange={(e) => onRecoveryCodeChange(formatRecoveryCode(e.target.value))}
              disabled={submitting}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </FormField>
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Icon name="LogIn" size="sm" />}
            isLoading={submitting}
            disabled={!recoveryComplete}
          >
            {submitLabel}
          </Button>
        </>
      )}

      {onToggleMode && (
        <Button type="button" variant="ghost" onClick={onToggleMode} disabled={submitting}>
          {mode === 'code' ? 'Usar um código de recuperação' : 'Usar o código do app'}
        </Button>
      )}
    </form>
  )
}
