import type { Metadata } from 'next'
import { OrdersContent } from './OrdersContent'

export const metadata: Metadata = { title: 'Pedidos' }

export default function PedidosPage() {
  return <OrdersContent />
}
