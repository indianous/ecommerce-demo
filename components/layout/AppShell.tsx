'use client'

import type { ReactNode } from 'react'
import { Footer, Navbar } from 'base-ds'
import type { FooterSocialLink } from 'base-ds'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { EmailVerificationBanner } from '@/components/layout/EmailVerificationBanner'
import { NavbarSearch } from '@/components/layout/NavbarSearch'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { StaffPreviewBanner } from '@/components/layout/StaffPreviewBanner'
import { StoreLogo } from '@/components/layout/StoreLogo'
import { UserMenu } from '@/components/layout/UserMenu'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="3.5" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" strokeWidth="0" />
  </svg>
)

const TikTokIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
  </svg>
)

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { instagramUrl, tiktokUrl, facebookUrl, navbarItems, footerColumns } = useSiteSettings()

  const socialLinks: FooterSocialLink[] = [
    instagramUrl && { icon: <InstagramIcon />, href: instagramUrl, label: 'Instagram' },
    tiktokUrl && { icon: <TikTokIcon />, href: tiktokUrl, label: 'TikTok' },
    facebookUrl && { icon: <FacebookIcon />, href: facebookUrl, label: 'Facebook' },
  ].filter(Boolean) as FooterSocialLink[]

  return (
    <>
      <StaffPreviewBanner />
      <Navbar
        logo={<StoreLogo />}
        items={navbarItems.length > 0 ? navbarItems : undefined}
        search={<NavbarSearch />}
        actions={[<NotificationBell key="notifications" />, <CartDrawer key="cart" />, <UserMenu key="user" />]}
        sticky
      />
      <EmailVerificationBanner />
      <main className="flex-1">{children}</main>
      <Footer
        columns={footerColumns.length > 0 ? footerColumns : undefined}
        copyright={`© ${new Date().getFullYear()} Loja`}
        socialLinks={socialLinks.length > 0 ? socialLinks : undefined}
      />
      <WhatsAppButton />
    </>
  )
}
