'use client'

import { Button, FileUpload, FormField, Rating, Text } from 'base-ds'

interface Props {
  rating: number
  onRatingChange: (value: number) => void
  comment: string
  onCommentChange: (value: string) => void
  images: File[]
  onImagesChange: (files: File[]) => void
  onSubmit: () => void
  onCancel?: () => void
  submitting: boolean
  submitLabel?: string
  error?: string | null
}

export function ReviewForm({
  rating,
  onRatingChange,
  comment,
  onCommentChange,
  images,
  onImagesChange,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = 'Enviar avaliação',
  error,
}: Props) {
  const isValid = rating > 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (isValid) onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="Sua nota" id="review-rating">
        <Rating value={rating} onChange={onRatingChange} size="lg" />
      </FormField>

      <FormField label="Comentário" id="review-comment">
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Conte como foi sua experiência com o produto"
        />
      </FormField>

      <FormField label="Fotos (opcional)" id="review-images">
        <FileUpload
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onImagesChange}
        />
      </FormField>

      {images.length > 0 && (
        <Text size="sm" color="muted">
          {images.length} foto(s) selecionada(s)
        </Text>
      )}

      {error && (
        <Text size="sm" color="destructive">
          {error}
        </Text>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={!isValid || submitting}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
