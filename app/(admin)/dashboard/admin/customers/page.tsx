import type { Metadata } from 'next'
import { CustomersContent } from '@/components/content/dashboard/people/CustomersContent'

export const metadata: Metadata = { title: 'Clientes' }

export default function AdminCustomersPage() {
  return <CustomersContent basePath="/dashboard/admin/customers" />
}
