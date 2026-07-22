import type { ReactNode } from 'react'
import { EmployeeShell } from '@/components/employee/EmployeeShell'

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return <EmployeeShell>{children}</EmployeeShell>
}
