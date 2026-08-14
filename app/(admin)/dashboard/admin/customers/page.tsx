import type { Metadata } from 'next'
import { CustomersContent } from '@/app/(employee)/dashboard/customers/CustomersContent'

export const metadata: Metadata = { title: 'Clientes' }

export default function AdminCustomersPage() {
  return <CustomersContent basePath="/dashboard/admin/customers" />
}
