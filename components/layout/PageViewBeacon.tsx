'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { getOrCreateSessionId } from '@/lib/tracking-session'

export function PageViewBeacon() {
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/tracking/page-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: getOrCreateSessionId(), path: pathname }),
    }).catch(() => {})
  }, [pathname])

  return null
}
