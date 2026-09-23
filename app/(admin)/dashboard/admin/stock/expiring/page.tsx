import type { Metadata } from 'next'
import { ExpiringLotsContent } from '@/components/content/dashboard/catalog/ExpiringLotsContent'

export const metadata: Metadata = { title: 'Estoque a vencer' }

export default function AdminStockExpiringPage() {
  return <ExpiringLotsContent />
}
