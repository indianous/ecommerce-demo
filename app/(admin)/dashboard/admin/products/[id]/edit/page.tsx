import type { Metadata } from 'next'
import { ProductEditContent } from '@/components/content/dashboard/catalog/ProductEditContent'

export const metadata: Metadata = { title: 'Editar produto' }

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductEditContent id={id} backPath="/dashboard/admin/products" />
}
