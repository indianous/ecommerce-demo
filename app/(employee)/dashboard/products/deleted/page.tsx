import type { Metadata } from 'next'
import { DeletedProductsContent } from './DeletedProductsContent'

export const metadata: Metadata = { title: 'Produtos excluídos' }

export default function DeletedProductsPage() {
  return <DeletedProductsContent />
}
