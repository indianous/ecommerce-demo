'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Heading, Pagination, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { ReviewForm } from '@/components/forms/ReviewForm'
import { ProductReviewCard } from '@/components/product/ProductReviewCard'
import type { ProductReview, ProductReviewPage, ReviewEligibility } from '@/types'

interface Props {
  productId: string
  reviews: ProductReviewPage
}

async function uploadImages(files: File[], accessToken: string): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    })
    if (!res.ok) throw new Error('Erro ao enviar uma das fotos.')
    const data = await res.json()
    urls.push(data.url as string)
  }
  return urls
}

export function ProductReviewsSection({ productId, reviews }: Props) {
  const { accessToken, isAuthenticated } = useAuthStore()
  const { toast } = useToast()

  const [reviewList, setReviewList] = useState<ProductReview[]>(reviews.content)
  const [reviewsPage, setReviewsPage] = useState(reviews.page)
  const [totalPages, setTotalPages] = useState(reviews.totalPages)
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    fetch(`/api/products/${productId}/reviews/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ReviewEligibility | null) => {
        setEligibility(data)
        if (data?.review) {
          setRating(data.review.rating)
          setComment(data.review.comment ?? '')
        }
      })
  }, [accessToken, productId])

  const refreshReviews = async (page = 0) => {
    const res = await fetch(`/api/products/${productId}/reviews?page=${page}`)
    if (res.ok) {
      const data: ProductReviewPage = await res.json()
      setReviewList(data.content)
      setReviewsPage(data.page)
      setTotalPages(data.totalPages)
    }
  }

  const handleSubmit = async () => {
    if (!accessToken) return
    setSubmitting(true)
    setError(null)
    try {
      const imageUrls = await uploadImages(images, accessToken)
      const isEditing = Boolean(eligibility?.alreadyReviewed && eligibility.review)
      const url = isEditing
        ? `/api/products/${productId}/reviews/${eligibility!.review!.id}`
        : `/api/products/${productId}/reviews`

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ rating, comment, imageUrls }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Erro ao enviar avaliação.' }))
        throw new Error(body.message ?? 'Erro ao enviar avaliação.')
      }

      const saved: ProductReview = await res.json()
      setEligibility((prev) => (prev ? { ...prev, alreadyReviewed: true, review: saved } : prev))
      setImages([])
      await refreshReviews()
      toast({ variant: 'success', description: isEditing ? 'Avaliação atualizada.' : 'Avaliação enviada.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar avaliação.'
      setError(message)
      toast({ variant: 'destructive', description: message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!accessToken || !eligibility?.review) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/products/${productId}/reviews/${eligibility.review.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      setEligibility((prev) => (prev ? { ...prev, alreadyReviewed: false, review: null } : prev))
      setRating(0)
      setComment('')
      await refreshReviews()
      toast({ variant: 'success', description: 'Avaliação excluída.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao excluir avaliação.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <Heading as="h2" size="xl">
        Avaliações
      </Heading>

      {!isAuthenticated && (
        <div className="rounded-md border border-border p-4">
          <Link href="/login" className="text-sm font-medium underline">
            Entrar para avaliar
          </Link>
        </div>
      )}

      {isAuthenticated && eligibility && !eligibility.eligible && !eligibility.alreadyReviewed && (
        <Text size="sm" color="muted">
          Você precisa ter recebido este produto para avaliá-lo.
        </Text>
      )}

      {isAuthenticated && eligibility && (eligibility.eligible || eligibility.alreadyReviewed) && (
        <div className="flex flex-col gap-3">
          <ReviewForm
            rating={rating}
            onRatingChange={setRating}
            comment={comment}
            onCommentChange={setComment}
            images={images}
            onImagesChange={setImages}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitLabel={eligibility.alreadyReviewed ? 'Salvar' : 'Enviar avaliação'}
            error={error}
          />
          {eligibility.alreadyReviewed && (
            <Button
              variant="danger"
              size="sm"
              className="w-fit"
              onClick={handleDelete}
              disabled={submitting}
            >
              Excluir avaliação
            </Button>
          )}
        </div>
      )}

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
