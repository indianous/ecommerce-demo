'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Heading, Icon, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { ProductReviewCard } from '@/components/product/ProductReviewCard'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { useConfirmDelete } from '@/lib/useConfirmDelete'
import type { ProductReview, ProductReviewPage } from '@/types'

interface Props {
  id: string
  basePath?: string
}

export function ProductReviewsModerationContent({ id, basePath = '/dashboard/products' }: Props) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${id}/reviews?size=50`)
      if (res.ok) {
        const data: ProductReviewPage = await res.json()
        setReviews(data.content)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleDeleteReview = async (review: ProductReview) => {
    if (!accessToken) return
    const res = await fetch(`/api/admin/products/${id}/reviews/${review.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      toast({ variant: 'destructive', description: 'Erro ao remover avaliação.' })
      throw new Error()
    }
    setReviews((prev) => prev.filter((r) => r.id !== review.id))
    toast({ variant: 'success', description: 'Avaliação removida.' })
  }

  const {
    target: reviewToDelete,
    setTarget: setReviewToDelete,
    deleting,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmDelete(handleDeleteReview)

  return (
    <PermissionGuard permissions={['MANAGE_PRODUCTS']}>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Heading as="h1" size="2xl">
            Avaliações do produto
          </Heading>
          <Link href={`${basePath}/${id}/edit`} className="text-sm underline">
            Voltar para o produto
          </Link>
        </div>

        {loading ? (
          <Text size="sm" color="muted">
            Carregando avaliações...
          </Text>
        ) : reviews.length === 0 ? (
          <Text size="sm" color="muted">
            Nenhuma avaliação para este produto.
          </Text>
        ) : (
          <div className="flex flex-col">
            {reviews.map((review) => (
              <div key={review.id} className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <ProductReviewCard review={review} />
                </div>
                <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label={`Remover avaliação de ${review.userName}`} variant="danger" size="sm" onClick={() => setReviewToDelete(review)} />
              </div>
            ))}
          </div>
        )}

        <ConfirmDeleteDialog
          open={reviewToDelete !== null}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          deleting={deleting}
          title="Remover avaliação"
          description="Essa ação não pode ser desfeita."
        />
      </main>
    </PermissionGuard>
  )
}
