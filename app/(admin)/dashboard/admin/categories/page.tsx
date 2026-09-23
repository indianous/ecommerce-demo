import type { Metadata } from 'next'
import { CategoriesContent } from '@/components/content/dashboard/catalog/CategoriesContent'

export const metadata: Metadata = { title: 'Categorias' }

export default function AdminCategoriesPage() {
  return <CategoriesContent />
}
