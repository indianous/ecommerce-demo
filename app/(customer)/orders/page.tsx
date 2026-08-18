import type { Metadata } from 'next'
import { OrdersContent } from './OrdersContent'

export const metadata: Metadata = { title: 'Meus pedidos' }

export default function OrdersPage() {
  return <OrdersContent />
}
