import type { Metadata } from 'next'
import { ProductReviewsModerationContent } from '@/components/content/dashboard/catalog/ProductReviewsModerationContent'

export const metadata: Metadata = { title: 'Avaliações do produto' }

export default async function ProductReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductReviewsModerationContent id={id} />
}
