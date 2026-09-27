import { Image, Rating, Text } from '@indianous/base-ds'
import type { ProductReview } from '@/types'

interface Props {
  review: ProductReview
}

export function ProductReviewCard({ review }: Props) {
  const formattedDate = new Intl.DateTimeFormat('pt-BR').format(new Date(review.createdAt))

  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <Rating value={review.rating} readOnly size="sm" />
        <Text size="xs" color="muted">
          {formattedDate}
        </Text>
      </div>

      <Text weight="bold" size="sm">
        {review.userName}
      </Text>

      {review.comment && <Text size="sm">{review.comment}</Text>}

      {review.imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {review.imageUrls.map((url) => (
            <Image
              key={url}
              src={url}
              alt={`Foto enviada por ${review.userName}`}
              aspectRatio="square"
              objectFit="cover"
              className="w-20 h-20 rounded"
            />
          ))}
        </div>
      )}
    </div>
  )
}
