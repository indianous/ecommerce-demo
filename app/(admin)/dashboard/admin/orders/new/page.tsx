import type { Metadata } from 'next'
import { ManualOrderContent } from '@/components/content/dashboard/sales/ManualOrderContent'

export const metadata: Metadata = { title: 'Novo pedido' }

export default function AdminNewOrderPage() {
  return <ManualOrderContent ordersPath="/dashboard/admin/orders" />
}
