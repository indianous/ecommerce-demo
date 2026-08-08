'use client'

import { useEffect, useState } from 'react'
import { Button, Dialog, Heading, Image, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { ReviewForm } from '@/components/forms/ReviewForm'
import { ProductReviewCard } from '@/components/product/ProductReviewCard'
import type { MyReviewableProduct } from '@/types'

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

export default function ReviewsPage() {
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

  const [deleteTarget, setDeleteTarget] = useState<MyReviewableProduct | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/reviews/me', { headers: { Authorization: `Bearer ${accessToken}` } })
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
        images.length > 0 ? await uploadImages(images, accessToken) : (formTarget.review?.imageUrls ?? [])

      const url = isEditing
        ? `/api/products/${formTarget.productId}/reviews/${formTarget.review!.id}`
        : `/api/products/${formTarget.productId}/reviews`

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
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

  const handleConfirmDelete = async () => {
    if (!accessToken || !deleteTarget?.review) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/products/${deleteTarget.productId}/reviews/${deleteTarget.review.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const deletedProductId = deleteTarget.productId
      setItems((prev) => prev.map((i) => (i.productId === deletedProductId ? { ...i, review: null } : i)))
      toast({ variant: 'success', description: 'Avaliação excluída.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao excluir avaliação.' })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Text color="muted">Carregando...</Text>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
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
                    <Button variant="secondary" size="sm" onClick={() => openEdit(item)}>
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`Excluir avaliação de ${item.productName}`}
                      onClick={() => setDeleteTarget(item)}
                    >
                      Excluir
                    </Button>
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
                  <Button size="sm" onClick={() => openCreate(item)}>
                    Avaliar
                  </Button>
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

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Excluir avaliação"
        description="Essa ação não pode ser desfeita."
        footer={
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleConfirmDelete} disabled={deleting}>
              Excluir
            </Button>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
          </div>
        }
      />
    </main>
  )
}
