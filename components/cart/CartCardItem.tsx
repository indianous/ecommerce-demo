'use client'

import { Image, Text } from 'base-ds'
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
      <button
        type="button"
        aria-label={`Remover ${item.name}`}
        onClick={() => removeItem(item.productId)}
        className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive hover:text-white"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
          <line x1="1" y1="1" x2="7" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="7" y1="1" x2="1" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

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
