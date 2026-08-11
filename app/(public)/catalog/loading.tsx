import { Card, Skeleton } from 'base-ds'

const SKELETON_COUNT = 8

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

export default function CatalogLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Catálogo</h1>

      <div
        role="status"
        aria-label="Carregando produtos"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      >
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </main>
  )
}
