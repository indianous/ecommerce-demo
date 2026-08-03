import { ProductEditContent } from '@/app/(employee)/dashboard/products/[id]/edit/ProductEditContent'

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductEditContent id={id} backPath="/dashboard/admin/products" />
}
