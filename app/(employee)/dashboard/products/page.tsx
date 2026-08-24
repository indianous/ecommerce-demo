import type { Metadata } from 'next'
import { ProductsContent } from '@/components/content/ProductsContent'

export const metadata: Metadata = { title: 'Produtos' }

export default function ProductsManagementPage() {
  return <ProductsContent />
}
