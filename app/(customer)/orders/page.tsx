import type { Metadata } from 'next'
import { CustomerOrdersContent } from '@/components/content/CustomerOrdersContent'

export const metadata: Metadata = { title: 'Meus pedidos' }

export default function OrdersPage() {
  return <CustomerOrdersContent />
}
