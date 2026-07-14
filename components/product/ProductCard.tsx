'use client'
import { Badge, Button, Card, Heading, Image, Text } from 'base-ds'
import type { Product } from '@/types'

interface Props {
  product: Product
}

export function ProductCard({ product }: Props) {
  const inStock = product.stockQuantity > 0
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(product.price)

  return (
    <Card variant="outlined" className="flex flex-col gap-2">
      {product.imageUrl && (
        <Image
          src={product.imageUrl}
          alt={product.name}
          aspectRatio="video"
          className="rounded"
        />
      )}

      <Badge variant="default" size="sm" className="w-fit">
        {product.categoryName}
      </Badge>
      <Heading as="h3" size="xl">
        {product.name}
      </Heading>

      {product.description && (
        <Text size="sm" color="muted" className="line-clamp-2">
          {product.description}
        </Text>
      )}

      <div className="mt-auto flex items-center justify-between gap-2">
        <Text weight="bold" size="lg">
          {formattedPrice}
        </Text>

        {inStock ? (
          <Button type="button" size="sm">
            Adicionar ao carrinho
          </Button>
        ) : (
          <Badge variant="danger" size="sm">
            Sem estoque
          </Badge>
        )}
      </div>
    </Card>
  )
}
