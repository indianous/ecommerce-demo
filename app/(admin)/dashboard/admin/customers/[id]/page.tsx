import { CustomerDetailContent } from '@/app/(employee)/dashboard/customers/[id]/CustomerDetailContent'

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CustomerDetailContent id={id} backPath="/dashboard/admin/customers" />
}
