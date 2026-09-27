'use client'

import { Carousel, Heading } from '@indianous/base-ds'
import { ProductCard } from '@/components/product/ProductCard'
import type { Product } from '@/types'

interface Props {
  title: string
  products: Product[]
}

/** Cards por página: o Carousel do base-ds mostra um item por vez, então cada item é uma grade de 4. */
const PAGE_SIZE = 4

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))
}

export function ProductCarousel({ title, products }: Props) {
  if (products.length === 0) return null

  const pages = chunk(products, PAGE_SIZE)
  const paginated = pages.length > 1

  return (
    <section className="flex flex-col gap-4">
      <Heading as="h2" size="xl">
        {title}
      </Heading>
      <Carousel
        showArrows={paginated}
        showDots={paginated}
        label={title}
        slideLabel={(n, total) => `Página ${n} de ${total}`}
        slideRoleDescription="página"
        previousLabel="Anterior"
        nextLabel="Próxima"
        dotLabel={(n) => `Ir para a página ${n}`}
        items={pages.map((page) => (
          <div key={page[0].id} className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {page.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ))}
      />
    </section>
  )
}
