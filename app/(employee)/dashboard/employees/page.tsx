import type { Metadata } from 'next'
import { EmployeesContent } from '@/components/content/dashboard/people/EmployeesContent'

export const metadata: Metadata = { title: 'Funcionários' }

export default function EmployeesPage() {
  return <EmployeesContent />
}
