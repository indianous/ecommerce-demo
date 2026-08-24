import type { Metadata } from 'next'
import { CustomersContent } from '@/components/content/CustomersContent'

export const metadata: Metadata = { title: 'Clientes' }

export default function ClientesPage() {
  return <CustomersContent />
}
