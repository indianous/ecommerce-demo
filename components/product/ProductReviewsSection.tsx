'use client'

import { useState } from 'react'
import { Heading, Pagination, Text } from 'base-ds'
import { ProductReviewCard } from '@/components/product/ProductReviewCard'
import type { ProductReview, ProductReviewPage } from '@/types'

interface Props {
  productId: string
  reviews: ProductReviewPage
}

export function ProductReviewsSection({ productId, reviews }: Props) {
  const [reviewList, setReviewList] = useState<ProductReview[]>(reviews.content)
  const [reviewsPage, setReviewsPage] = useState(reviews.page)
  const [totalPages, setTotalPages] = useState(reviews.totalPages)

  const refreshReviews = async (page = 0) => {
    const res = await fetch(`/api/products/${productId}/reviews?page=${page}`)
    if (res.ok) {
      const data: ProductReviewPage = await res.json()
      setReviewList(data.content)
      setReviewsPage(data.page)
      setTotalPages(data.totalPages)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <Heading as="h2" size="xl">
        Avaliações
      </Heading>

      <div className="flex flex-col">
        {reviewList.length === 0 ? (
          <Text size="sm" color="muted">
            Ainda não há avaliações para este produto.
          </Text>
        ) : (
          reviewList.map((review) => <ProductReviewCard key={review.id} review={review} />)
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={reviewsPage + 1}
          totalPages={totalPages}
          onPageChange={(page) => refreshReviews(page - 1)}
        />
      )}
    </section>
  )
}
