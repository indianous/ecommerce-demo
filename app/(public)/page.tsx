import type { Metadata } from "next";
import { ProductGridSection } from "@/components/product/ProductGridSection";
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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16">
        <BannerCarousel banners={banners} />
        <ProductGridSection title="Produtos populares" products={popular} />
        <ProductGridSection title="Mais vendidos" products={bestSelling} />
      </div>
    </div>
  );
}
