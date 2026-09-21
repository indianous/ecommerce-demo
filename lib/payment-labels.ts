import type { PaymentMethod } from '@/types'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  BOLETO: 'Boleto',
  PAY_ON_PICKUP: 'Pagar na retirada',
}

/** Rótulo da forma de pagamento; um valor desconhecido (dado antigo/novo) volta como está. */
export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method
}
