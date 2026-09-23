import { Button, FormField, Icon, Input, NumberInput, Radio, Switch, Text } from 'base-ds'
import type { CouponInput, CouponType } from '@/types'

/** Campos opcionais como texto: vazio quer dizer "sem limite". Datas no formato do datetime-local. */
export type CouponFormState = {
  code: string
  type: CouponType
  value: number
  maxDiscountAmount: string
  minSubtotal: string
  startsAt: string
  endsAt: string
  maxUses: string
  maxUsesPerCustomer: string
  active: boolean
}

export const EMPTY_COUPON_FORM: CouponFormState = {
  code: '',
  type: 'PERCENT',
  value: 10,
  maxDiscountAmount: '',
  minSubtotal: '',
  startsAt: '',
  endsAt: '',
  maxUses: '',
  maxUsesPerCustomer: '',
  active: true,
}

const CODE = /^[A-Z0-9_-]{3,30}$/

const optionalNumber = (v: string) => (v.trim() === '' ? null : Number(v))

export function toCouponInput(form: CouponFormState): CouponInput {
  return {
    code: form.code.trim(),
    type: form.type,
    value: form.value,
    maxDiscountAmount: form.type === 'PERCENT' ? optionalNumber(form.maxDiscountAmount) : null,
    minSubtotal: optionalNumber(form.minSubtotal),
    startsAt: form.startsAt || null,
    endsAt: form.endsAt || null,
    maxUses: optionalNumber(form.maxUses),
    maxUsesPerCustomer: optionalNumber(form.maxUsesPerCustomer),
    active: form.active,
  }
}

function limitError(v: string): string | undefined {
  if (v.trim() === '') return undefined
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 ? undefined : 'Use um número inteiro a partir de 1'
}

function amountError(v: string): string | undefined {
  if (v.trim() === '') return undefined
  return Number(v) > 0 ? undefined : 'Use um valor maior que zero'
}

interface Props {
  form: CouponFormState
  onFormChange: (patch: Partial<CouponFormState>) => void
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
  /** Cupom já usado: tipo e valor não podem mudar (o backend recusa). */
  valueLocked?: boolean
}

export function CouponForm({ form, onFormChange, onSubmit, saving, valueLocked = false }: Props) {
  const codeError = form.code && !CODE.test(form.code) ? 'Use de 3 a 30 letras, números, - ou _' : undefined
  const valueError =
    form.type === 'PERCENT'
      ? form.value < 1 || form.value > 100 ? 'O percentual vai de 1 a 100' : undefined
      : form.value > 0 ? undefined : 'O valor precisa ser maior que zero'
  const datesError =
    form.startsAt && form.endsAt && form.endsAt <= form.startsAt ? 'O fim precisa ser depois do início' : undefined
  const errors = {
    maxDiscountAmount: form.type === 'PERCENT' ? amountError(form.maxDiscountAmount) : undefined,
    minSubtotal: amountError(form.minSubtotal),
    maxUses: limitError(form.maxUses),
    maxUsesPerCustomer: limitError(form.maxUsesPerCustomer),
  }
  const canSubmit =
    form.code !== '' && !codeError && !valueError && !datesError && Object.values(errors).every((e) => !e)

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField label="Código" id="coupon-code" error={codeError} hint="O cliente digita este código no checkout.">
        <Input
          id="coupon-code"
          value={form.code}
          onChange={(e) => onFormChange({ code: e.target.value.toUpperCase() })}
          placeholder="NATAL10"
          maxLength={30}
        />
      </FormField>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Tipo de desconto</legend>
        <div className="flex flex-wrap gap-4">
          <Radio id="coupon-type-percent" name="coupon-type" value="PERCENT" label="Percentual" disabled={valueLocked}
            checked={form.type === 'PERCENT'} onChange={() => onFormChange({ type: 'PERCENT' })} />
          <Radio id="coupon-type-fixed" name="coupon-type" value="FIXED" label="Valor fixo" disabled={valueLocked}
            checked={form.type === 'FIXED'} onChange={() => onFormChange({ type: 'FIXED' })} />
        </div>
        {valueLocked && (
          <Text size="sm" color="muted">Este cupom já foi usado: o tipo e o valor não podem mudar.</Text>
        )}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={form.type === 'PERCENT' ? 'Desconto (%)' : 'Desconto (R$)'} id="coupon-value" error={valueError}>
          <NumberInput
            id="coupon-value"
            value={form.value}
            min={0}
            max={form.type === 'PERCENT' ? 100 : undefined}
            step={form.type === 'PERCENT' ? 1 : 0.01}
            disabled={valueLocked}
            onChange={(value) => onFormChange({ value })}
          />
        </FormField>
        {form.type === 'PERCENT' && (
          <FormField label="Teto de desconto (R$)" id="coupon-max-discount" error={errors.maxDiscountAmount} hint="Opcional">
            <Input id="coupon-max-discount" type="number" min={0} step={0.01} value={form.maxDiscountAmount}
              onChange={(e) => onFormChange({ maxDiscountAmount: e.target.value })} />
          </FormField>
        )}
        <FormField label="Pedido mínimo (R$)" id="coupon-min-subtotal" error={errors.minSubtotal} hint="Opcional">
          <Input id="coupon-min-subtotal" type="number" min={0} step={0.01} value={form.minSubtotal}
            onChange={(e) => onFormChange({ minSubtotal: e.target.value })} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Início" id="coupon-starts" hint="Opcional">
          <Input id="coupon-starts" type="datetime-local" value={form.startsAt}
            onChange={(e) => onFormChange({ startsAt: e.target.value })} />
        </FormField>
        <FormField label="Fim" id="coupon-ends" error={datesError} hint="Opcional">
          <Input id="coupon-ends" type="datetime-local" value={form.endsAt}
            onChange={(e) => onFormChange({ endsAt: e.target.value })} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Usos no total" id="coupon-max-uses" error={errors.maxUses} hint="Vazio = sem limite">
          <Input id="coupon-max-uses" type="number" min={1} step={1} value={form.maxUses}
            onChange={(e) => onFormChange({ maxUses: e.target.value })} />
        </FormField>
        <FormField label="Usos por cliente" id="coupon-max-per-customer" error={errors.maxUsesPerCustomer} hint="Vazio = sem limite">
          <Input id="coupon-max-per-customer" type="number" min={1} step={1} value={form.maxUsesPerCustomer}
            onChange={(e) => onFormChange({ maxUsesPerCustomer: e.target.value })} />
        </FormField>
      </div>

      <Switch id="coupon-active" label="Ativo" checked={form.active} onChange={(active) => onFormChange({ active })} />

      <div>
        <Button leftIcon={<Icon name="Save" size="sm" />} type="submit" variant="primary" disabled={!canSubmit} isLoading={saving}>
          Salvar cupom
        </Button>
      </div>
    </form>
  )
}
