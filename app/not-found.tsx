'use client'

import { AppShell } from '@/components/layout/AppShell'
import { NotFoundContent } from '@/components/content/shared/NotFoundContent'

export default function NotFound() {
  return (
    <AppShell>
      <NotFoundContent />
    </AppShell>
  )
}
