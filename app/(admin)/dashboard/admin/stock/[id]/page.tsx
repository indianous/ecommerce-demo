import { StockMovementHistoryContent } from '@/app/(employee)/dashboard/stock/[id]/StockMovementHistoryContent'

export default async function AdminStockMovementHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StockMovementHistoryContent productId={id} stockBasePath="/dashboard/admin/stock" />
}
