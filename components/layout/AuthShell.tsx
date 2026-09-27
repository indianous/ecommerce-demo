'use client'

import type { ReactNode } from 'react'
import { Footer } from 'base-ds'
import { StoreLogo } from '@/components/layout/StoreLogo'

/**
 * Header e footer mínimos do login, do cadastro e das telas de conta: só o logo centralizado (que leva à home) e
 * os links de política. Sem busca, carrinho, notificações nem menu do usuário. O <main> continua no layout.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* <header> nativo: o Navbar do base-ds não centraliza o logo a partir de md (indianous/base-ds#50) */}
      <header className="border-b border-border bg-background">
        <div className="flex h-14 items-center justify-center px-4">
          <StoreLogo />
        </div>
      </header>
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
