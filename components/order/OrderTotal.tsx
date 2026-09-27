import { Text } from '@indianous/base-ds'
import { formatBRL } from '@/lib/format'

interface Props {
  totalAmount: number
  discountAmount?: number
  couponCode?: string | null
}

/** Total do pedido e, quando houve cupom, a linha do desconto logo abaixo. */
export function OrderTotal({ totalAmount, discountAmount = 0, couponCode }: Props) {
  return (
    <span className="inline-flex flex-col">
      <span className="font-semibold">{formatBRL(totalAmount)}</span>
      {discountAmount > 0 && (
        <Text as="span" size="sm" color="muted">
          Desconto{couponCode ? ` (${couponCode})` : ''}: − {formatBRL(discountAmount)}
        </Text>
      )}
    </span>
  )
}
