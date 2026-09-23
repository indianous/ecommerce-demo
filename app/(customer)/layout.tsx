import { Suspense, type ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageSkeleton } from '@/components/layout/PageSkeleton'

// O Suspense permite useSearchParams nas páginas sem quebrar o prerender do `next build` (plano #57).
export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppShell>
  )
}
