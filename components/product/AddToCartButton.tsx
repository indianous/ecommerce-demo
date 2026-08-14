'use client'

import { Badge } from 'base-ds'
import { IconButton } from '@/components/ui/IconButton'
import { useCartStore } from '@/stores/cart.store'
import type { Product } from '@/types'

interface Props {
  product: Product
}

export function AddToCartButton({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const unavailable = !product.active || product.status === 'UNAVAILABLE'
  const inStock = product.stockQuantity > 0

  if (unavailable) {
    return (
      <Badge variant="danger" size="sm">
        Produto indisponível
      </Badge>
    )
  }

  if (!inStock) {
    return (
      <Badge variant="danger" size="sm">
        Sem estoque
      </Badge>
    )
  }

  return (
    <IconButton
      icon="ShoppingCart"
      label="Adicionar ao carrinho"
      variant="primary"
      onClick={() =>
        addItem({
          productId: product.id,
          name: product.name,
          price: product.effectivePrice ?? product.price,
          imageUrl: product.imageUrl,
        })
      }
    />
  )
}
