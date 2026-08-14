import type { Metadata } from 'next'
import { DeletedProductsContent } from '@/app/(employee)/dashboard/products/deleted/DeletedProductsContent'

export const metadata: Metadata = { title: 'Produtos excluídos' }

export default function AdminDeletedProductsPage() {
  return <DeletedProductsContent />
}
