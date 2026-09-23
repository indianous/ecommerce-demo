import type { Metadata } from 'next'
import { OrderDetailContent } from '@/components/content/dashboard/sales/OrderDetailContent'

export const metadata: Metadata = { title: 'Detalhes do pedido' }

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OrderDetailContent id={id} />
}
