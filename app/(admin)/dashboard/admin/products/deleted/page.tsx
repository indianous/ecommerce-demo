import type { Metadata } from 'next'
import { DeletedProductsContent } from '@/components/content/dashboard/catalog/DeletedProductsContent'

export const metadata: Metadata = { title: 'Produtos excluídos' }

export default function AdminDeletedProductsPage() {
  return <DeletedProductsContent />
}
