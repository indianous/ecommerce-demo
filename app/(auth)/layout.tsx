import { Suspense, type ReactNode } from 'react'
import { PageSkeleton } from '@/components/layout/PageSkeleton'

// O Suspense permite useSearchParams nas páginas sem quebrar o prerender do `next build` (plano #57).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}
