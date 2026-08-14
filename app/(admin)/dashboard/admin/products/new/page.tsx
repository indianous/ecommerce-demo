import type { Metadata } from 'next'
import { ProductCreateContent } from '@/app/(employee)/dashboard/products/new/ProductCreateContent'

export const metadata: Metadata = { title: 'Novo produto' }

export default function AdminProductCreatePage() {
  return <ProductCreateContent backPath="/dashboard/admin/products" />
}
