import { OrderDetailContent } from './OrderDetailContent'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OrderDetailContent id={id} />
}
