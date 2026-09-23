import type { Metadata } from 'next'
import { PromotionsContent } from '@/components/content/dashboard/catalog/PromotionsContent'

export const metadata: Metadata = { title: 'Promoções' }

export default function PromotionsPage() {
  return <PromotionsContent />
}
