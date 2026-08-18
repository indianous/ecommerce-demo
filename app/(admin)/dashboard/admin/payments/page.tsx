import type { Metadata } from 'next'
import { PaymentsContent } from '@/app/(employee)/dashboard/payments/PaymentsContent'

export const metadata: Metadata = { title: 'Pagamentos' }

export default function AdminPaymentsPage() {
  return <PaymentsContent basePath="/dashboard/admin/payments" />
}
