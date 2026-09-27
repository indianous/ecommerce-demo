import { Card, Skeleton, Text } from '@indianous/base-ds'
import { ProductCard } from '@/components/product/ProductCard'
import type { Product } from '@/types'

const GRID_CLASSES = 'grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'

interface Props {
  products: Product[]
}

export function ProductGrid({ products }: Props) {
  if (products.length === 0) {
    return <Text color="muted">Nenhum produto encontrado.</Text>
  }

  return (
    <div className={GRID_CLASSES}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

interface SkeletonProps {
  count?: number
}

export function ProductGridSkeleton({ count = 8 }: SkeletonProps) {
  return (
    <div role="status" aria-label="Carregando produtos" className={GRID_CLASSES}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

function ProductCardSkeleton() {
  return (
    <Card variant="outlined" className="flex flex-col gap-2">
      <Skeleton variant="rect" className="aspect-[3/4] w-full" />
      <Skeleton variant="line" width="40%" />
      <Skeleton variant="line" width="80%" height={24} />
      <Skeleton variant="line" width="60%" />
      <div className="mt-auto flex items-center justify-between gap-2">
        <Skeleton variant="line" width="30%" height={24} />
        <Skeleton variant="rect" width={120} height={36} />
      </div>
    </Card>
  )
}
