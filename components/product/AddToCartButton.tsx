'use client'

import { Badge, Button } from 'base-ds'
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
    <Button
      type="button"
      onClick={() =>
        addItem({
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
        })
      }
    >
      Adicionar ao carrinho
    </Button>
  )
}
