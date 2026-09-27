import { Button, FormField, Icon, Input, NumberInput, Radio, Text } from '@indianous/base-ds'
import { formatBRL } from '@/lib/format'
import type { PromotionType } from '@/types'

export type PromotionFormState = {
  /** O identificador comum da promoção, por exemplo "Black Friday 2026". */
  name: string
  type: PromotionType
  value: number
  /** Formato do input datetime-local: "2026-10-01T00:00". */
  startDate: string
  endDate: string
}

export const EMPTY_PROMOTION_FORM: PromotionFormState = { name: '', type: 'PERCENT', value: 10, startDate: '', endDate: '' }

/** Preço promocional que a promoção daria para um produto de preço {@code basePrice}. */
export function promotionalPriceFor(form: PromotionFormState, basePrice: number): number {
  if (form.type === 'FIXED_PRICE') return form.value
  return Math.round(basePrice * (100 - form.value)) / 100
}

function valueError(form: PromotionFormState, basePrice?: number): string | undefined {
  if (form.type === 'PERCENT') {
    return form.value < 1 || form.value > 99 ? 'O percentual precisa estar entre 1 e 99' : undefined
  }
  if (!(form.value > 0)) return 'O preço promocional precisa ser maior que zero'
  if (basePrice !== undefined && form.value >= basePrice) {
    return `O preço promocional precisa ser menor que o preço normal (${formatBRL(basePrice)})`
  }
  return undefined
}

function datesError(form: PromotionFormState): string | undefined {
  if (form.startDate && form.endDate && form.endDate <= form.startDate) {
    return 'O fim precisa ser depois do início'
  }
  return undefined
}

interface Props {
  form: PromotionFormState
  onFormChange: (patch: Partial<PromotionFormState>) => void
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
  /** Preço normal quando a promoção é de um produto só: habilita a prévia e a validação do preço fixo. */
  basePrice?: number
  submitLabel?: string
}

export function PromotionForm({ form, onFormChange, onSubmit, saving, basePrice, submitLabel = 'Salvar promoção' }: Props) {
  const errorOnValue = valueError(form, basePrice)
  const errorOnDates = datesError(form)
  const canSubmit =
    form.name.trim() !== '' && !errorOnValue && !errorOnDates && form.startDate !== '' && form.endDate !== ''

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField label="Nome" id="promotion-name">
        <Input
          id="promotion-name"
          value={form.name}
          onChange={(e) => onFormChange({ name: e.target.value })}
          placeholder="Black Friday 2026"
          maxLength={100}
        />
      </FormField>

      <fieldset className="flex flex-wrap gap-4">
        <legend className="sr-only">Tipo de promoção</legend>
        <Radio
          id="promotion-type-percent"
          name="promotion-type"
          value="PERCENT"
          label="Percentual"
          checked={form.type === 'PERCENT'}
          onChange={() => onFormChange({ type: 'PERCENT' })}
        />
        <Radio
          id="promotion-type-fixed"
          name="promotion-type"
          value="FIXED_PRICE"
          label="Preço fixo"
          checked={form.type === 'FIXED_PRICE'}
          onChange={() => onFormChange({ type: 'FIXED_PRICE' })}
        />
      </fieldset>

      <FormField
        label={form.type === 'PERCENT' ? 'Desconto (%)' : 'Preço promocional (R$)'}
        id="promotion-value"
        error={errorOnValue}
      >
        <NumberInput
          id="promotion-value"
          value={form.value}
          min={0}
          max={form.type === 'PERCENT' ? 99 : undefined}
          step={form.type === 'PERCENT' ? 1 : 0.01}
          onChange={(value) => onFormChange({ value })}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Início" id="promotion-start">
          <Input
            id="promotion-start"
            type="datetime-local"
            value={form.startDate}
            onChange={(e) => onFormChange({ startDate: e.target.value })}
          />
        </FormField>
        <FormField label="Fim" id="promotion-end" error={errorOnDates}>
          <Input
            id="promotion-end"
            type="datetime-local"
            value={form.endDate}
            onChange={(e) => onFormChange({ endDate: e.target.value })}
          />
        </FormField>
      </div>

      {basePrice !== undefined && !errorOnValue && (
        <Text size="sm" color="muted">
          Preço promocional: {formatBRL(promotionalPriceFor(form, basePrice))} (normal: {formatBRL(basePrice)})
        </Text>
      )}

      <div>
        <Button leftIcon={<Icon name="BadgePercent" size="sm" />} type="submit" variant="primary" disabled={!canSubmit} isLoading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
