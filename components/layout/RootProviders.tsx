'use client'
import type { ReactNode } from 'react'
import { ToastProvider, ToastViewport } from 'base-ds'
import { AuthHydrator } from './AuthHydrator'

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastViewport />
      <AuthHydrator />
    </ToastProvider>
  )
}
