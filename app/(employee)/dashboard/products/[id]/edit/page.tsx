import { ProductEditContent } from './ProductEditContent'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductEditContent id={id} />
}
