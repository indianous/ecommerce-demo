'use client'

import { useState } from 'react'
import { Badge, Button, Icon, useToast } from 'base-ds'
import { useCartStore } from '@/stores/cart.store'
import type { Product } from '@/types'

interface Props {
  product: Product
}

export function AddToCartButton({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
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

  const handleClick = async () => {
    setIsLoading(true)
    try {
      await addItem({
        productId: product.id,
        name: product.name,
        price: product.effectivePrice ?? product.price,
        imageUrl: product.imageUrls[0],
      })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao adicionar ao carrinho.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button iconOnly leftIcon={<Icon name="ShoppingCart" size="sm" />} aria-label="Adicionar ao carrinho" variant="primary" isLoading={isLoading} onClick={handleClick} />
  )
}
