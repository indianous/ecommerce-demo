import type { Metadata } from 'next'
import { EmployeeOrdersContent } from '@/components/content/dashboard/sales/EmployeeOrdersContent'

export const metadata: Metadata = { title: 'Pedidos' }

export default function PedidosPage() {
  return <EmployeeOrdersContent />
}
