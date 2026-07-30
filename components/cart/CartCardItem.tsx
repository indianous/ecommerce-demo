'use client'

import { Button, Image, NumberInput, Text } from 'base-ds'
import { useCartStore } from '@/stores/cart.store'
import type { CartItem } from '@/types'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

interface CartCardItemProps {
  item: CartItem
}

export function CartCardItem({ item }: CartCardItemProps) {
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)

  return (
    <div className="flex gap-3 rounded-lg border border-border p-3">
      {item.imageUrl && (
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
          <Image src={item.imageUrl} alt={item.name} aspectRatio="square" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Text size="sm" weight="medium" className="line-clamp-2 leading-snug">
            {item.name}
          </Text>
          <Text size="sm" color="muted" className="whitespace-nowrap">
            {formatBRL(item.price)}
          </Text>
        </div>

        <div className="flex items-center justify-between gap-2">
          <NumberInput
            id={`cart-qty-${item.productId}`}
            value={item.quantity}
            min={1}
            onChange={(value) => updateQuantity(item.productId, value)}
          />
          <div className="flex items-center gap-2">
            <Text size="sm" weight="bold">
              {formatBRL(item.price * item.quantity)}
            </Text>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Remover ${item.name}`}
              onClick={() => removeItem(item.productId)}
            >
              Remover
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
