import type { Metadata } from 'next'
import { ExpiringLotsContent } from '@/components/content/ExpiringLotsContent'

export const metadata: Metadata = { title: 'Estoque a vencer' }

export default function StockExpiringPage() {
  return <ExpiringLotsContent />
}
