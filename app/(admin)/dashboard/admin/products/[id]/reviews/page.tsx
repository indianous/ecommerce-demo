import { ProductReviewsModerationContent } from '@/app/(employee)/dashboard/products/[id]/reviews/ProductReviewsModerationContent'

export default async function AdminProductReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductReviewsModerationContent id={id} basePath="/dashboard/admin/products" />
}
