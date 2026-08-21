'use client'

import { Button, Icon, Image, Text } from 'base-ds'
import { useCartStore } from '@/stores/cart.store'
import type { CartItem } from '@/types'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

interface CartCardItemProps {
  item: CartItem
}

export function CartCardItem({ item }: CartCardItemProps) {
  const removeItem = useCartStore((s) => s.removeItem)

  return (
    <div className="relative flex gap-3 rounded-lg border border-border p-3">
      <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label={`Remover ${item.name}`} variant="danger" size="sm" onClick={() => removeItem(item.productId)} className="absolute right-1.5 top-1.5 !h-5 !w-5" />

      {item.imageUrl && (
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
          <Image src={item.imageUrl} alt={item.name} aspectRatio="square" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
        <Text size="sm" weight="medium" className="line-clamp-2 pr-2 leading-snug">
          {item.name}
        </Text>
        <Text size="sm" color="muted">
          Qtd: {item.quantity}
        </Text>
        <Text size="sm" weight="bold">
          {formatBRL(item.price * item.quantity)}
        </Text>
      </div>
    </div>
  )
}
