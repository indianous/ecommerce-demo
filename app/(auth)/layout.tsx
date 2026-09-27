import { Suspense, type ReactNode } from 'react'
import { AuthShell } from '@/components/layout/AuthShell'
import { PageSkeleton } from '@/components/layout/PageSkeleton'

// Sem o shell da loja: header e footer mínimos, e o layout continua dono do landmark <main> (plano #55).
// O Suspense permite useSearchParams nas páginas sem quebrar o prerender do `next build` (plano #57).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthShell>
      <main className="flex-1">
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </main>
    </AuthShell>
  )
}
