'use client'

import Link from 'next/link'
import { Heading, Text } from 'base-ds'
import { AppShell } from '@/components/layout/AppShell'

export default function NotFound() {
  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <Heading as="h1" size="4xl">
          Página não encontrada
        </Heading>
        <Text size="lg" color="muted" className="max-w-xl">
          A página que você procura não existe ou foi movida.
        </Text>
        {/*
          base-ds's Button only renders a <button> (no `href`/asChild support),
          so a real navigation link can't be built from it. Styled directly
          with base-ds's own tokens (bg-primary/text-primary-foreground/etc)
          to match Button's primary look, same workaround used in app/(public)/page.tsx.
        */}
        <Link
          href="/"
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Voltar para o início
        </Link>
      </div>
    </AppShell>
  )
}
