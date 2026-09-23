import { Container } from 'base-ds'
import { ProductGridSkeleton } from '@/components/product/ProductGrid'

export default function CatalogLoading() {
  return (
    <Container width="7xl">
      <h1 className="mb-6 text-2xl font-bold">Catálogo</h1>

      <ProductGridSkeleton />
    </Container>
  )
}
