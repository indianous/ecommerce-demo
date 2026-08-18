import type { Metadata } from 'next'
import { ProductEditContent } from './ProductEditContent'

export const metadata: Metadata = { title: 'Editar produto' }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductEditContent id={id} />
}
