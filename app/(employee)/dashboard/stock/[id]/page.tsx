import { StockMovementHistoryContent } from './StockMovementHistoryContent'

export default async function StockMovementHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StockMovementHistoryContent productId={id} />
}
