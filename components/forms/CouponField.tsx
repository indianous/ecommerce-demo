import { Button, FormField, Icon, Input, Text } from '@indianous/base-ds'
import { formatBRL } from '@/lib/format'
import type { CouponValidation } from '@/types'

interface Props {
  code: string
  onCodeChange: (code: string) => void
  onApply: () => void
  onRemove: () => void
  applied: CouponValidation | null
  error: string | null
  applying: boolean
}

/** Campo de cupom do checkout. Puro: o checkout guarda o código, o cupom aplicado e o erro. */
export function CouponField({ code, onCodeChange, onApply, onRemove, applied, error, applying }: Props) {
  if (applied) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Text size="sm">
          Cupom <strong>{applied.code}</strong> aplicado: − {formatBRL(applied.discountAmount)}
        </Text>
        <Button type="button" leftIcon={<Icon name="X" size="sm" />} variant="ghost" size="sm" onClick={onRemove}>Remover cupom</Button>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2">
      <FormField label="Cupom de desconto" id="checkout-coupon" error={error ?? undefined} className="flex-1">
        <Input
          id="checkout-coupon"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter aqui aplica o cupom em vez de enviar o pedido
            if (e.key === 'Enter') {
              e.preventDefault()
              if (code.trim()) onApply()
            }
          }}
          placeholder="Tem um cupom?"
          maxLength={30}
        />
      </FormField>
      <Button type="button" variant="outline" onClick={onApply} disabled={!code.trim()} isLoading={applying}>Aplicar</Button>
    </div>
  )
}
