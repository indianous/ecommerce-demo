'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface SiteSettingsContextValue {
  placeholderImageUrl: string | null
}

export const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  placeholderImageUrl: null,
})

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [placeholderImageUrl, setPlaceholderImageUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/site/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.placeholderImageUrl) setPlaceholderImageUrl(data.placeholderImageUrl)
      })
      .catch(() => {})
  }, [])

  return (
    <SiteSettingsContext.Provider value={{ placeholderImageUrl }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}
