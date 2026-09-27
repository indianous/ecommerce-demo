'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { FooterColumn, NavItem as NavbarNavItem } from '@indianous/base-ds'
import type { SiteNavItem } from '@/types'

interface SiteSettingsContextValue {
  placeholderImageUrl: string | null
  faviconUrl: string | null
  logoUrl: string | null
  instagramUrl: string | null
  tiktokUrl: string | null
  facebookUrl: string | null
  /** Telefone de contato do site, que também é o WhatsApp da loja. */
  contactPhone: string | null
  navbarItems: NavbarNavItem[]
  footerColumns: FooterColumn[]
}

export const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  placeholderImageUrl: null,
  faviconUrl: null,
  logoUrl: null,
  instagramUrl: null,
  tiktokUrl: null,
  facebookUrl: null,
  contactPhone: null,
  navbarItems: [],
  footerColumns: [],
})

function buildNavbarItems(tree: SiteNavItem[]): NavbarNavItem[] {
  return tree
    .filter((item) => item.placement === 'NAVBAR' || item.placement === 'BOTH')
    .map((item): NavbarNavItem =>
      item.type === 'COLLECTION'
        ? {
            type: 'dropdown',
            label: item.label,
            items: (item.children ?? []).map((child) => ({ label: child.label, href: child.url })),
          }
        : { type: 'link', label: item.label, href: item.url },
    )
}

function buildFooterColumns(tree: SiteNavItem[]): FooterColumn[] {
  return tree
    .filter((item) => item.placement === 'FOOTER' || item.placement === 'BOTH')
    .map((item): FooterColumn =>
      item.type === 'COLLECTION'
        ? {
            title: item.label,
            links: (item.children ?? []).map((child) => ({ label: child.label, href: child.url ?? '' })),
          }
        : { title: item.label, links: [{ label: item.label, href: item.url ?? '' }] },
    )
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [placeholderImageUrl, setPlaceholderImageUrl] = useState<string | null>(null)
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [instagramUrl, setInstagramUrl] = useState<string | null>(null)
  const [tiktokUrl, setTiktokUrl] = useState<string | null>(null)
  const [facebookUrl, setFacebookUrl] = useState<string | null>(null)
  const [contactPhone, setContactPhone] = useState<string | null>(null)
  const [navbarItems, setNavbarItems] = useState<NavbarNavItem[]>([])
  const [footerColumns, setFooterColumns] = useState<FooterColumn[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/site/settings').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/site/nav-items').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([settings, navItems]: [Record<string, string> | null, SiteNavItem[]]) => {
        if (settings?.placeholderImageUrl) setPlaceholderImageUrl(settings.placeholderImageUrl)
        if (settings?.faviconUrl) setFaviconUrl(settings.faviconUrl)
        if (settings?.logoUrl) setLogoUrl(settings.logoUrl)
        if (settings?.instagramUrl) setInstagramUrl(settings.instagramUrl)
        if (settings?.tiktokUrl) setTiktokUrl(settings.tiktokUrl)
        if (settings?.facebookUrl) setFacebookUrl(settings.facebookUrl)
        if (settings?.contactPhone) setContactPhone(settings.contactPhone)

        const tree = Array.isArray(navItems) ? navItems : []
        setNavbarItems(buildNavbarItems(tree))
        setFooterColumns(buildFooterColumns(tree))
      })
      .catch(() => {})
  }, [])

  return (
    <SiteSettingsContext.Provider
      value={{
        placeholderImageUrl,
        faviconUrl,
        logoUrl,
        instagramUrl,
        tiktokUrl,
        facebookUrl,
        contactPhone,
        navbarItems,
        footerColumns,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}
