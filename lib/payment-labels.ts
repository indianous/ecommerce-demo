import type { PaymentGatewayProvider, PaymentMethod } from '@/types'

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

const PAYMENT_PROVIDER_LABELS: Record<PaymentGatewayProvider, string> = {
  MANUAL: 'Pagamento manual',
  STRIPE: 'Stripe',
  PAGSEGURO: 'PagBank',
}

/** Gateway que criou o pagamento; `null` para pedidos antigos (sem registro) ou valor desconhecido. */
export function paymentProviderLabel(provider: string | null | undefined): string | null {
  if (!provider) return null
  return PAYMENT_PROVIDER_LABELS[provider as PaymentGatewayProvider] ?? null
}
