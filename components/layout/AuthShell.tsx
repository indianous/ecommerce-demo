'use client'

import type { ReactNode } from 'react'
import { Footer, Navbar } from '@indianous/base-ds'
import { StoreLogo } from '@/components/layout/StoreLogo'

/**
 * Header e footer mínimos do login, do cadastro e das telas de conta: só o logo centralizado (que leva à home) e
 * os links de política. Sem busca, carrinho, notificações nem menu do usuário. O <main> continua no layout.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar logo={<StoreLogo />} logoAlign="center" />
      {children}
      <Footer
        copyright={`© ${new Date().getFullYear()} Loja`}
        columns={[
          {
            title: 'Informações',
            links: [
              { label: 'Política de privacidade', href: '/privacy-policy' },
              { label: 'Termos e condições', href: '/terms-and-conditions' },
            ],
          },
        ]}
      />
    </div>
  )
}
