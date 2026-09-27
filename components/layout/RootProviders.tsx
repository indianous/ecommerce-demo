'use client'
import type { ReactNode } from 'react'
import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import { AuthHydrator } from './AuthHydrator'
import { PageViewBeacon } from './PageViewBeacon'
import { TrafficAttributionCapture } from './TrafficAttributionCapture'
import { SiteSettingsProvider } from '@/contexts/SiteSettingsContext'
import { DynamicFavicon } from './DynamicFavicon'

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SiteSettingsProvider>
        <DynamicFavicon />
        {children}
      </SiteSettingsProvider>
      <ToastViewport />
      <AuthHydrator />
      <TrafficAttributionCapture />
      <PageViewBeacon />
    </ToastProvider>
  )
}
