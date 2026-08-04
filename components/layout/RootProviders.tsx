'use client'
import type { ReactNode } from 'react'
import { ToastProvider, ToastViewport } from 'base-ds'
import { AuthHydrator } from './AuthHydrator'
import { SiteSettingsProvider } from '@/contexts/SiteSettingsContext'

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SiteSettingsProvider>
        {children}
      </SiteSettingsProvider>
      <ToastViewport />
      <AuthHydrator />
    </ToastProvider>
  )
}
