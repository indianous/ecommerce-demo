import type { Metadata } from 'next'
import { PromotionsContent } from '@/components/content/dashboard/catalog/PromotionsContent'

export const metadata: Metadata = { title: 'Promoções' }

export default function AdminPromotionsPage() {
  return <PromotionsContent basePath="/dashboard/admin/promotions" />
}
