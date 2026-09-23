import { Suspense, type ReactNode } from 'react'
import { PageSkeleton } from '@/components/layout/PageSkeleton'

// Sem shell: o layout é o dono do landmark <main> (plano #55).
// O Suspense permite useSearchParams nas páginas sem quebrar o prerender do `next build` (plano #57).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </main>
  )
}
