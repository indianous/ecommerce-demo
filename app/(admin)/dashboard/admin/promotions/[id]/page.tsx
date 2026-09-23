import type { Metadata } from 'next'
import { PromotionDetailContent } from '@/components/content/dashboard/catalog/PromotionDetailContent'

export const metadata: Metadata = { title: 'Promoção' }

export default async function AdminPromotionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PromotionDetailContent id={id} basePath="/dashboard/admin/promotions" />
}
