import type { Metadata } from 'next'
import { EmployeesContent } from '@/components/content/EmployeesContent'

export const metadata: Metadata = { title: 'Funcionários' }

export default function EmployeesPage() {
  return <EmployeesContent />
}
