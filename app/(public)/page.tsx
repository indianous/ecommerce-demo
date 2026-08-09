import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Início',
  description: 'Explore nosso catálogo e encontre os melhores produtos com entrega rápida.',
}
import { Button, Heading, Text } from "base-ds";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Heading as="h1" size="4xl">
        Tudo o que você precisa, em um só lugar
      </Heading>
      <Text size="lg" color="muted" className="max-w-xl">
        Explore nosso catálogo e encontre os melhores produtos com entrega rápida.
      </Text>
      <Button as="a" href="/catalog">
        Ver catálogo
      </Button>
    </div>
  );
}
