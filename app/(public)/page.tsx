import type { Metadata } from "next";
import { Heading, Text } from "base-ds";
import { IconButton } from "@/components/ui/IconButton";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { BannerCarousel } from "@/components/site/BannerCarousel";
import type { Banner, Product } from "@/types";

export const metadata: Metadata = {
  title: 'Início',
  description: 'Explore nosso catálogo e encontre os melhores produtos com entrega rápida.',
}

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

async function fetchProducts(path: string): Promise<Product[]> {
  try {
    const res = await fetch(`${API}/catalog/products/${path}?limit=8`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function fetchBanners(): Promise<Banner[]> {
  try {
    const res = await fetch(`${API}/site/banners`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function Home() {
  const [popular, bestSelling, banners] = await Promise.all([
    fetchProducts('popular'),
    fetchProducts('best-selling'),
    fetchBanners(),
  ])

  return (
    <div className="flex flex-1 flex-col gap-16 px-6 py-16">
      <BannerCarousel banners={banners} />

      <div className="flex flex-col items-center justify-center gap-6 text-center">
        <Heading as="h1" size="4xl">
          Tudo o que você precisa, em um só lugar
        </Heading>
        <Text size="lg" color="muted" className="max-w-xl">
          Explore nosso catálogo e encontre os melhores produtos com entrega rápida.
        </Text>
        <IconButton as="a" href="/catalog" icon="ArrowRight" label="Ver catálogo" variant="primary" />
      </div>

      <div className="mx-auto w-full max-w-5xl flex flex-col gap-12">
        <ProductCarousel title="Produtos populares" products={popular} />
        <ProductCarousel title="Mais vendidos" products={bestSelling} />
      </div>
    </div>
  );
}
