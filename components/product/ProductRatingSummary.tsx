import { Rating, Text } from 'base-ds'

interface Props {
  averageRating: number | null
  reviewCount: number
}

export function ProductRatingSummary({ averageRating, reviewCount }: Props) {
  if (reviewCount === 0 || averageRating === null) {
    return (
      <Text size="sm" color="muted">
        Seja o primeiro a avaliar
      </Text>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Rating value={Math.round(averageRating)} readOnly size="md" />
      <Text size="sm" color="muted">
        {averageRating.toFixed(1)} ({reviewCount} avaliações)
      </Text>
    </div>
  )
}
