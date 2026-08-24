import type { Metadata } from 'next'
import { StockMovementHistoryContent } from '@/components/content/StockMovementHistoryContent'

export const metadata: Metadata = { title: 'Detalhes do estoque' }

export default async function StockMovementHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StockMovementHistoryContent productId={id} />
}
