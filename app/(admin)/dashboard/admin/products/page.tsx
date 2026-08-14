import type { Metadata } from 'next'
import { ProductsContent } from '@/app/(employee)/dashboard/products/ProductsContent'

export const metadata: Metadata = { title: 'Produtos' }

export default function AdminProductsPage() {
  return <ProductsContent basePath="/dashboard/admin/products" />
}
