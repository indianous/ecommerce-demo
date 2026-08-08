'use client'

import { useEffect } from 'react'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'

export function DynamicFavicon() {
  const { faviconUrl } = useSiteSettings()

  useEffect(() => {
    if (!faviconUrl) return
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = faviconUrl
  }, [faviconUrl])

  return null
}
