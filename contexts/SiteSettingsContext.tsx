'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface SiteSettingsContextValue {
  placeholderImageUrl: string | null
  faviconUrl: string | null
  instagramUrl: string | null
  tiktokUrl: string | null
  facebookUrl: string | null
}

export const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  placeholderImageUrl: null,
  faviconUrl: null,
  instagramUrl: null,
  tiktokUrl: null,
  facebookUrl: null,
})

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [placeholderImageUrl, setPlaceholderImageUrl] = useState<string | null>(null)
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null)
  const [instagramUrl, setInstagramUrl] = useState<string | null>(null)
  const [tiktokUrl, setTiktokUrl] = useState<string | null>(null)
  const [facebookUrl, setFacebookUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/site/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.placeholderImageUrl) setPlaceholderImageUrl(data.placeholderImageUrl)
        if (data?.faviconUrl) setFaviconUrl(data.faviconUrl)
        if (data?.instagramUrl) setInstagramUrl(data.instagramUrl)
        if (data?.tiktokUrl) setTiktokUrl(data.tiktokUrl)
        if (data?.facebookUrl) setFacebookUrl(data.facebookUrl)
      })
      .catch(() => {})
  }, [])

  return (
    <SiteSettingsContext.Provider value={{ placeholderImageUrl, faviconUrl, instagramUrl, tiktokUrl, facebookUrl }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}
