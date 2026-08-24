import type { Metadata } from 'next'
import { EmployeesContent } from '@/app/(employee)/dashboard/employees/EmployeesContent'

export const metadata: Metadata = { title: 'Funcionários' }

export default function EmployeesPage() {
  return <EmployeesContent />
}
