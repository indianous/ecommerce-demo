import { ProductGridSkeleton } from '@/components/product/ProductGrid'

export default function CatalogLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Catálogo</h1>

      <ProductGridSkeleton />
    </main>
  )
}
