import type { OrderResponse } from '@/types'

/**
 * O que mostrar para o cliente voltar a pagar: "pay" (link válido), "expired" (validade vencida) ou
 * `null` (nada a fazer — pagamento já resolvido ou sem link, como no pagamento manual).
 */
export function payNowState(
  order: Pick<OrderResponse, 'paymentStatus' | 'checkoutUrl' | 'paymentExpiresAt'>,
  now: number,
): 'pay' | 'expired' | null {
  if (order.paymentStatus !== 'PENDING' || !order.checkoutUrl) return null

  const expiresAt = order.paymentExpiresAt ? Date.parse(order.paymentExpiresAt) : Number.NaN
  // validade ausente ou ilegível não pode travar o cliente: mantém o link
  if (Number.isNaN(expiresAt)) return 'pay'
  return expiresAt <= now ? 'expired' : 'pay'
}
