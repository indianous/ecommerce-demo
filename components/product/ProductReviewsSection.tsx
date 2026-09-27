'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Heading, Text } from '@indianous/base-ds'
import { ProductReviewCard } from '@/components/product/ProductReviewCard'
import { PaginationBar } from '@/components/ui/PaginationBar'
import type { ProductReviewPage } from '@/types'

interface Props {
  reviews: ProductReviewPage
}

export function ProductReviewsSection({ reviews }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('reviewsPage', String(page))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <section className="flex flex-col gap-6">
      <Heading as="h2" size="xl">
        Avaliações
      </Heading>

      <div className="flex flex-col">
        {reviews.content.length === 0 ? (
          <Text size="sm" color="muted">
            Ainda não há avaliações para este produto.
          </Text>
        ) : (
          reviews.content.map((review) => <ProductReviewCard key={review.id} review={review} />)
        )}
      </div>

      <PaginationBar page={reviews.page + 1} totalPages={reviews.totalPages} onPageChange={goToPage} />
    </section>
  )
}
