import type { Metadata } from 'next'
import { CouponsContent } from '@/components/content/dashboard/sales/CouponsContent'

export const metadata: Metadata = { title: 'Cupons' }

export default function AdminCouponsPage() {
  return <CouponsContent ordersPath="/dashboard/admin/orders" />
}
