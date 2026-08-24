import type { Metadata } from 'next'
import { StockContent } from '@/components/content/StockContent'

export const metadata: Metadata = { title: 'Estoque' }

export default function StockPage() {
  return <StockContent />
}
