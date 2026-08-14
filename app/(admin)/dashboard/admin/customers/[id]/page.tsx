import type { Metadata } from 'next'
import { CustomerDetailContent } from '@/app/(employee)/dashboard/customers/[id]/CustomerDetailContent'

export const metadata: Metadata = { title: 'Detalhes do cliente' }

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CustomerDetailContent id={id} backPath="/dashboard/admin/customers" />
}
