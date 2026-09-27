import { Heading } from '@indianous/base-ds'
import { ProductGrid } from '@/components/product/ProductGrid'
import type { Product } from '@/types'

interface Props {
  title: string
  products: Product[]
}

export function ProductGridSection({ title, products }: Props) {
  if (products.length === 0) return null

  return (
    <section className="flex flex-col gap-6">
      <Heading as="h2" size="2xl">
        {title}
      </Heading>
      <ProductGrid products={products} />
    </section>
  )
}
