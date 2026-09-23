import { Suspense } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { PageSkeleton } from '@/components/layout/PageSkeleton'

// O Suspense permite useSearchParams nas páginas sem quebrar o prerender do `next build` (plano #57).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AdminShell>
  )
}
