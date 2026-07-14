import Link from "next/link";
import { Heading, Text } from "base-ds";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Heading as="h1" size="4xl">
        Tudo o que você precisa, em um só lugar
      </Heading>
      <Text size="lg" color="muted" className="max-w-xl">
        Explore nosso catálogo e encontre os melhores produtos com entrega rápida.
      </Text>
      {/*
        base-ds's Button only renders a <button> (no `href`/asChild support),
        so a real navigation link can't be built from it. Styled directly
        with base-ds's own tokens (bg-primary/text-primary-foreground/etc)
        to match Button's primary look. Flagged to review whether Button
        should grow link support.
      */}
      <Link
        href="/catalog"
        className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Ver catálogo
      </Link>
    </div>
  );
}
