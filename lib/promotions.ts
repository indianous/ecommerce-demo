import { formatBRL, toDateTimeLocalValue } from '@/lib/format'
import type { PromotionFormState } from '@/components/forms/PromotionForm'
import type { Promotion, PromotionDetail, PromotionInput, PromotionStatus } from '@/types'

export const PROMOTION_STATUS_BADGE: Record<PromotionStatus, { label: string; variant: 'success' | 'info' | 'default' }> = {
  ACTIVE: { label: 'Ativa', variant: 'success' },
  SCHEDULED: { label: 'Agendada', variant: 'info' },
  EXPIRED: { label: 'Encerrada', variant: 'default' },
}

/** "20%" ou "R$ 49,90". */
export function promotionDiscountLabel(p: Pick<Promotion, 'type' | 'value'>): string {
  return p.type === 'PERCENT' ? `${p.value}%` : formatBRL(p.value)
}

/** "20% de desconto" ou "Preço fixo de R$ 49,90". */
export function promotionRuleLabel(p: Pick<Promotion, 'type' | 'value'>): string {
  return p.type === 'PERCENT' ? `${p.value}% de desconto` : `Preço fixo de ${formatBRL(p.value)}`
}

export function toPromotionForm(p: Promotion | PromotionDetail): PromotionFormState {
  return {
    name: p.name,
    type: p.type,
    value: p.value,
    startDate: toDateTimeLocalValue(p.startDate),
    endDate: toDateTimeLocalValue(p.endDate),
  }
}

export function toPromotionInput(form: PromotionFormState): PromotionInput {
  return { ...form, name: form.name.trim() }
}

/** Mensagem de erro do backend ({ message }), ou {@code fallback}. */
export async function responseMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null)
  return (data as { message?: string } | null)?.message ?? fallback
}

export function productsLabel(count: number): string {
  return `${count} ${count === 1 ? 'produto' : 'produtos'}`
}
