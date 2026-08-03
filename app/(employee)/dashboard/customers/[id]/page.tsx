import { CustomerDetailContent } from './CustomerDetailContent'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CustomerDetailContent id={id} />
}
