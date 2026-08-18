import type { Metadata } from 'next'
import { ExpiringLotsContent } from '@/app/(employee)/dashboard/stock/expiring/ExpiringLotsContent'

export const metadata: Metadata = { title: 'Estoque a vencer' }

export default function AdminStockExpiringPage() {
  return <ExpiringLotsContent />
}
