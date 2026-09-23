import type { Metadata } from 'next'
import { ProductsContent } from '@/components/content/dashboard/catalog/ProductsContent'

export const metadata: Metadata = { title: 'Produtos' }

export default function ProductsManagementPage() {
  return <ProductsContent />
}
