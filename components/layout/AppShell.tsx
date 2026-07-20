'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Footer, Navbar, ToastProvider, ToastViewport } from 'base-ds'
import { CartDrawer } from '@/components/cart/CartDrawer'

const NAV_ITEMS = [
  { label: 'Catálogo', href: '/catalog' },
  { label: 'Carrinho', href: '/cart' },
]

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
        items={NAV_ITEMS}
        actions={[<CartDrawer key="cart" />]}
        sticky
      />
      <main className="flex-1">{children}</main>
      <Footer copyright={`© ${new Date().getFullYear()} Loja`} />
      <ToastViewport />
    </ToastProvider>
  )
}
