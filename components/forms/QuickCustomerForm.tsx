import { Button, FormField, Icon, Input, Switch } from 'base-ds'
import { isValidCpf } from '@/lib/cpf'
import type { QuickCustomerInput } from '@/types'

export type QuickCustomerFormState = { name: string; email: string; phone: string; cpf: string; sendInvite: boolean }

export const EMPTY_QUICK_CUSTOMER: QuickCustomerFormState = { name: '', email: '', phone: '', cpf: '', sendInvite: false }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function toQuickCustomerInput(form: QuickCustomerFormState): QuickCustomerInput {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || null,
    cpf: form.cpf.trim() || null,
    sendInvite: form.sendInvite,
  }
}

interface Props {
  form: QuickCustomerFormState
  onChange: (patch: Partial<QuickCustomerFormState>) => void
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
}

/** Cadastro rápido de cliente pela equipe. E-mail é obrigatório: as notificações do pedido vão para ele. */
export function QuickCustomerForm({ form, onChange, onSubmit, saving }: Props) {
  const emailError = form.email.trim() && !EMAIL.test(form.email.trim()) ? 'E-mail inválido' : undefined
  const cpfError = form.cpf.trim() && !isValidCpf(form.cpf) ? 'CPF inválido' : undefined
  const canSubmit = form.name.trim() !== '' && form.email.trim() !== '' && !emailError && !cpfError

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField label="Nome" id="quick-customer-name">
        <Input id="quick-customer-name" value={form.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={255} />
      </FormField>
      <FormField label="E-mail" id="quick-customer-email" error={emailError} hint="Obrigatório: o cliente recebe as atualizações do pedido.">
        <Input id="quick-customer-email" type="email" value={form.email} onChange={(e) => onChange({ email: e.target.value })} />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Telefone" id="quick-customer-phone" hint="Opcional">
          <Input id="quick-customer-phone" type="tel" value={form.phone} onChange={(e) => onChange({ phone: e.target.value })} maxLength={20} />
        </FormField>
        <FormField label="CPF" id="quick-customer-cpf" error={cpfError} hint="Opcional">
          <Input id="quick-customer-cpf" value={form.cpf} onChange={(e) => onChange({ cpf: e.target.value })} maxLength={14} />
        </FormField>
      </div>
      <Switch
        id="quick-customer-invite"
        label="Enviar convite para criar senha"
        checked={form.sendInvite}
        onChange={(checked) => onChange({ sendInvite: checked })}
      />
      <div>
        <Button leftIcon={<Icon name="UserPlus" size="sm" />} type="submit" variant="primary" disabled={!canSubmit} isLoading={saving}>
          Cadastrar cliente
        </Button>
      </div>
    </form>
  )
}
