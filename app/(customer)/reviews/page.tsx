import type { Metadata } from 'next'
import { ReviewsContent } from '@/components/content/ReviewsContent'

export const metadata: Metadata = { title: 'Minhas avaliações' }

export default function ReviewsPage() {
  return <ReviewsContent />
}
