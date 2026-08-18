import type { Metadata } from 'next'
import { ProductsContent } from './ProductsContent'

export const metadata: Metadata = { title: 'Produtos' }

export default function ProductsManagementPage() {
  return <ProductsContent />
}
