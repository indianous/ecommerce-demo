import type { Metadata } from 'next'
import { ProductCreateContent } from '@/components/content/ProductCreateContent'

export const metadata: Metadata = { title: 'Novo produto' }

export default function AdminProductCreatePage() {
  return <ProductCreateContent backPath="/dashboard/admin/products" />
}
