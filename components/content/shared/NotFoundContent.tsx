'use client'

import { Button, Heading, Text } from '@indianous/base-ds'

export function NotFoundContent() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Heading as="h1" size="4xl">
        Página não encontrada
      </Heading>
      <Text size="lg" color="muted" className="max-w-xl">
        A página que você procura não existe ou foi movida.
      </Text>
      <Button as="a" href="/">
        Voltar para o início
      </Button>
    </div>
  )
}
