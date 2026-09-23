import { Suspense, type ReactNode } from 'react'
import { EmployeeShell } from '@/components/employee/EmployeeShell'
import { PageSkeleton } from '@/components/layout/PageSkeleton'

// O Suspense permite useSearchParams nas páginas sem quebrar o prerender do `next build` (plano #57).
export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <EmployeeShell>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </EmployeeShell>
  )
}
