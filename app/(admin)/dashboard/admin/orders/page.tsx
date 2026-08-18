import type { Metadata } from 'next'
import { OrdersContent } from '@/app/(employee)/dashboard/orders/OrdersContent'

export const metadata: Metadata = { title: 'Pedidos' }

export default function AdminOrdersPage() {
  return <OrdersContent orderBasePath="/dashboard/admin/orders" />
}
