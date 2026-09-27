import { Button, FormField, Icon, Input, PasswordInput, Switch } from '@indianous/base-ds'
import { PASSWORD_TOO_SHORT, isValidPassword } from '@/lib/password-policy'
import type { EmployeeInput } from '@/types'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type EmployeeFormState = { name: string; email: string; password: string; sendInvite: boolean }

/** Convite ligado por padrão: quem cadastra não precisa escolher (nem conhecer) a senha da pessoa. */
export const EMPTY_EMPLOYEE_FORM: EmployeeFormState = { name: '', email: '', password: '', sendInvite: true }

export function toEmployeeInput(form: EmployeeFormState): EmployeeInput {
  const base = { name: form.name.trim(), email: form.email.trim() }
  return form.sendInvite ? base : { ...base, password: form.password }
}

interface Props {
  value: EmployeeFormState
  onChange: (patch: Partial<EmployeeFormState>) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  saveLabel?: string
}

/** Cadastro de funcionário ou administrador. Sem senha, a conta nasce sem senha e a pessoa recebe o convite. */
export function EmployeeForm({ value, onChange, onSave, onCancel, saving, saveLabel = 'Salvar' }: Props) {
  const email = value.email.trim()
  const emailError = email && !EMAIL.test(email) ? 'E-mail inválido' : undefined
  const passwordError = !value.sendInvite && value.password && !isValidPassword(value.password) ? PASSWORD_TOO_SHORT : undefined
  const canSubmit =
    value.name.trim() !== '' && email !== '' && !emailError && (value.sendInvite || isValidPassword(value.password))

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Nome" id="emp-name">
        <Input id="emp-name" value={value.name} onChange={(e) => onChange({ name: e.target.value })} />
      </FormField>
      <FormField label="E-mail" id="emp-email" error={emailError}>
        <Input id="emp-email" type="email" value={value.email} onChange={(e) => onChange({ email: e.target.value })} />
      </FormField>
      <Switch
        id="emp-send-invite"
        label="Enviar convite para criar senha"
        checked={value.sendInvite}
        onChange={(checked) => onChange({ sendInvite: checked })}
      />
      {!value.sendInvite && (
        <FormField label="Senha" id="emp-password" error={passwordError} hint="Mínimo de 8 caracteres">
          <PasswordInput
            id="emp-password"
            value={value.password}
            onChange={(e) => onChange({ password: e.target.value })}
            autoComplete="new-password"
          />
        </FormField>
      )}
      <div className="flex gap-2 justify-end">
        <Button leftIcon={<Icon name="X" size="sm" />} variant="secondary" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button leftIcon={<Icon name="Save" size="sm" />} variant="primary" onClick={onSave} disabled={!canSubmit} isLoading={saving}>{saveLabel}</Button>
      </div>
    </div>
  )
}
