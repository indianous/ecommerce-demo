import type { Metadata } from 'next'
import { ProductReviewsModerationContent } from '@/components/content/ProductReviewsModerationContent'

export const metadata: Metadata = { title: 'Avaliações do produto' }

export default async function AdminProductReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductReviewsModerationContent id={id} basePath="/dashboard/admin/products" />
}
