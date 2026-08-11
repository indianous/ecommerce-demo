import { Carousel, Heading } from 'base-ds'
import { ProductCard } from '@/components/product/ProductCard'
import type { Product } from '@/types'

interface Props {
  title: string
  products: Product[]
}

export function ProductCarousel({ title, products }: Props) {
  if (products.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <Heading as="h2" size="xl">
        {title}
      </Heading>
      <Carousel items={products.map((p) => <ProductCard key={p.id} product={p} />)} />
    </section>
  )
}
