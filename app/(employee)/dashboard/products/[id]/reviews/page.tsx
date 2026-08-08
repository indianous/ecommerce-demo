import { ProductReviewsModerationContent } from './ProductReviewsModerationContent'

export default async function ProductReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductReviewsModerationContent id={id} />
}
