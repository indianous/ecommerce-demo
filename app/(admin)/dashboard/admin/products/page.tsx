import type { Metadata } from 'next'
import { ProductsContent } from '@/components/content/dashboard/catalog/ProductsContent'

export const metadata: Metadata = { title: 'Produtos' }

export default function AdminProductsPage() {
  return <ProductsContent basePath="/dashboard/admin/products" />
}
