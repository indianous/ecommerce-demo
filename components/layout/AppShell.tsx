'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Footer, Navbar, ToastProvider, ToastViewport } from 'base-ds'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { NavbarSearch } from '@/components/layout/NavbarSearch'
import { UserMenu } from '@/components/layout/UserMenu'
import { AuthHydrator } from '@/components/layout/AuthHydrator'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ToastProvider>
      <Navbar
        logo={
          <Link href="/" className="text-lg font-semibold text-foreground">
            Loja
          </Link>
        }
        search={<NavbarSearch />}
        actions={[<CartDrawer key="cart" />, <UserMenu key="user" />]}
        sticky
      />
      <main className="flex-1">{children}</main>
      <Footer copyright={`© ${new Date().getFullYear()} Loja`} />
      <ToastViewport />
      <AuthHydrator />
    </ToastProvider>
  )
}
