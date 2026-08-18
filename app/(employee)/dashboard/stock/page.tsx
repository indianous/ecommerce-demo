import type { Metadata } from 'next'
import { StockContent } from './StockContent'

export const metadata: Metadata = { title: 'Estoque' }

export default function StockPage() {
  return <StockContent />
}
