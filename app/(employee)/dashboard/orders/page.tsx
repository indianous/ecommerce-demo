import type { Metadata } from 'next'
import { EmployeeOrdersContent } from '@/components/content/EmployeeOrdersContent'

export const metadata: Metadata = { title: 'Pedidos' }

export default function PedidosPage() {
  return <EmployeeOrdersContent />
}
