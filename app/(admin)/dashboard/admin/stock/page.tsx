import type { Metadata } from 'next'
import { StockContent } from '@/components/content/dashboard/catalog/StockContent'

export const metadata: Metadata = { title: 'Estoque' }

export default function AdminStockPage() {
  return <StockContent stockBasePath="/dashboard/admin/stock" />
}
