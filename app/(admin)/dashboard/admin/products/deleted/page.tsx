import type { Metadata } from 'next'
import { DeletedProductsContent } from '@/components/content/DeletedProductsContent'

export const metadata: Metadata = { title: 'Produtos excluídos' }

export default function AdminDeletedProductsPage() {
  return <DeletedProductsContent />
}
