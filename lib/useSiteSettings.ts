'use client'
import { useCallback, useEffect, useState } from 'react'
import type { SiteSettings } from '@/types'

/** Configurações do site (`GET /api/site/settings`, público). `settings` é nulo se a chamada falhar. */
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(
    () =>
      fetch('/api/site/settings')
        .then((r) => (r.ok ? r.json() : null))
        .then((data: SiteSettings | null) => setSettings(data))
        .catch(() => setSettings(null)),
    [],
  )

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [reload])

  return { settings, loading, reload }
}
