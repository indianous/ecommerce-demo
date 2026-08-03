import { OrderDetailContent } from '@/app/(employee)/dashboard/orders/[id]/OrderDetailContent'

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OrderDetailContent id={id} backPath="/dashboard/admin/orders" />
}
