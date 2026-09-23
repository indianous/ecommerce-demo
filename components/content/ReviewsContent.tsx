'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { Button, Container, Dialog, Heading, Icon, Image, Skeleton, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { ReviewForm } from '@/components/forms/ReviewForm'
import { ProductReviewCard } from '@/components/product/ProductReviewCard'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { useConfirmDelete } from '@/lib/useConfirmDelete'
import type { MyReviewableProduct } from '@/types'

async function uploadImages(files: File[]): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await authFetch('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error('Erro ao enviar uma das fotos.')
    const data = await res.json()
    urls.push(data.url as string)
  }
  return urls
}

export function ReviewsContent() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const [items, setItems] = useState<MyReviewableProduct[]>([])
  const [loading, setLoading] = useState(() => Boolean(accessToken))

  const [formTarget, setFormTarget] = useState<MyReviewableProduct | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    authFetch('/api/reviews/me')
      .then((res) => (res.ok ? res.json() : []))
      .then(setItems)
      .finally(() => setLoading(false))
  }, [accessToken])

  const openCreate = (item: MyReviewableProduct) => {
    setFormTarget(item)
    setRating(0)
    setComment('')
    setImages([])
    setError(null)
  }

  const openEdit = (item: MyReviewableProduct) => {
    setFormTarget(item)
    setRating(item.review?.rating ?? 0)
    setComment(item.review?.comment ?? '')
    setImages([])
    setError(null)
  }

  const closeForm = () => setFormTarget(null)

  const handleSubmit = async () => {
    if (!accessToken || !formTarget) return
    setSubmitting(true)
    setError(null)
    try {
      const isEditing = Boolean(formTarget.review)
      const imageUrls =
        images.length > 0 ? await uploadImages(images) : (formTarget.review?.imageUrls ?? [])

      const url = isEditing
        ? `/api/products/${formTarget.productId}/reviews/${formTarget.review!.id}`
        : `/api/products/${formTarget.productId}/reviews`

      const res = await authFetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ rating, comment, imageUrls }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Erro ao enviar avaliação.' }))
        throw new Error(body.message ?? 'Erro ao enviar avaliação.')
      }

      const saved = await res.json()
      const savedProductId = formTarget.productId
      setItems((prev) => prev.map((i) => (i.productId === savedProductId ? { ...i, review: saved } : i)))
      toast({ variant: 'success', description: isEditing ? 'Avaliação atualizada.' : 'Avaliação enviada.' })
      closeForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar avaliação.'
      setError(message)
      toast({ variant: 'destructive', description: message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteReview = async (item: MyReviewableProduct) => {
    if (!accessToken || !item.review) return
    const res = await authFetch(`/api/products/${item.productId}/reviews/${item.review.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      toast({ variant: 'destructive', description: 'Erro ao excluir avaliação.' })
      throw new Error()
    }
    const deletedProductId = item.productId
    setItems((prev) => prev.map((i) => (i.productId === deletedProductId ? { ...i, review: null } : i)))
    toast({ variant: 'success', description: 'Avaliação excluída.' })
  }

  const {
    target: deleteTarget,
    setTarget: setDeleteTarget,
    deleting,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmDelete(handleDeleteReview)

  if (loading) {
    return (
      <Container width="3xl" role="status" aria-label="Carregando avaliações">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="line" height={40} className="mb-2" />
        ))}
      </Container>
    )
  }

  return (
    <Container width="3xl">
      <Heading as="h1" size="2xl" className="mb-6">
        Minhas Avaliações
      </Heading>

      {items.length === 0 ? (
        <Text color="muted">Nenhum produto disponível para avaliação.</Text>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.productId} className="rounded-md border border-border p-4">
              {item.review ? (
                <div className="flex flex-col gap-3">
                  <Text weight="bold">{item.productName}</Text>
                  <ProductReviewCard review={item.review} />
                  <div className="flex gap-3">
                    <Button leftIcon={<Icon name="Pencil" size="sm" />} variant="secondary" size="sm" onClick={() => openEdit(item)}>Editar</Button>
                    <Button leftIcon={<Icon name="Trash2" size="sm" />} variant="danger" size="sm" onClick={() => setDeleteTarget(item)}>{`Excluir avaliação de ${item.productName}`}</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {item.productImageUrl && (
                      <Image
                        src={item.productImageUrl}
                        alt={item.productName}
                        aspectRatio="square"
                        objectFit="cover"
                        className="h-16 w-16 rounded"
                      />
                    )}
                    <Text weight="bold">{item.productName}</Text>
                  </div>
                  <Button leftIcon={<Icon name="Star" size="sm" />} variant="primary" size="sm" onClick={() => openCreate(item)}>Avaliar</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={formTarget !== null}
        onClose={closeForm}
        title={
          formTarget?.review
            ? `Editar avaliação — ${formTarget.productName}`
            : `Avaliar ${formTarget?.productName ?? ''}`
        }
      >
        <ReviewForm
          rating={rating}
          onRatingChange={setRating}
          comment={comment}
          onCommentChange={setComment}
          images={images}
          onImagesChange={setImages}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          submitting={submitting}
          submitLabel={formTarget?.review ? 'Salvar' : 'Enviar avaliação'}
          error={error}
        />
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        deleting={deleting}
        title="Excluir avaliação"
        description="Essa ação não pode ser desfeita."
      />
    </Container>
  )
}
