# Home: grid estático de produtos e remoção do hero (design "Claude Design")

## Contexto

Duas homes foram desenhadas no Claude Design (projeto `43271aa3-f6fe-498c-8cd7-b36b5a8a50d0`,
arquivos `Home Ecommerce.dc.html` e `Home Ecommerce Mobile.dc.html`), lidos via
`DesignSync` (não são artboards renderizáveis por `WebFetch`/scraping — o link
de artifact `de81afc0-...` é o mesmo design embrulhado como bundle JS, sem
conteúdo estático extraível).

Comparado à home atual (`app/(public)/page.tsx`), o design:

- Não tem hero (título "Tudo o que você precisa..." + botão "Ver catálogo").
- Troca os carrosséis horizontais de produto por grid estático (4 colunas
  desktop / 2 colunas mobile).
- Adiciona um grid "Promoções" (categorias com % de desconto) e uma seção de
  newsletter — **ambos fora de escopo por decisão do usuário**: `Category`
  (`backend/.../category/Category.java`) não tem campo de desconto nem
  imagem, e não existe controller/tabela de assinantes para newsletter. Ficam
  para um plano futuro se o backend for construído.
- Repete Navbar (busca, carrinho, conta) e Footer (colunas, redes sociais) —
  já implementados de verdade em `components/layout/AppShell.tsx` via
  `Navbar`/`Footer` do `base-ds`, com dados dinâmicos de
  `SiteSettingsContext` (mais completo que o mock estático do design). Sem
  mudança aqui.
- Repete o banner carousel — já coberto por `components/site/BannerCarousel.tsx`.
  Sem mudança aqui.

Ou seja, o único trabalho real desta rodada é: remover o hero e trocar
`ProductCarousel` por um grid estático na home, reaproveitando o
`ProductGrid` já existente (extraído em `frontend/plans/14-grid-produtos.md`),
que aquele plano explicitamente deixou de fora da home ("home fica com
Carousel, não entra nesse plano") — decisão agora revertida pelo usuário.

## 1. Problemas encontrados

- `app/(public)/page.tsx:46-54` — hero (`Heading` "Tudo o que você precisa,
  em um só lugar" + `Text` + `IconButton` "Ver catálogo") não existe no
  design aprovado; a navegação para `/catalog` já está coberta pelo item
  "Catálogo" do `Navbar` (`SiteSettingsContext.navbarItems`), então remover o
  hero não perde uma rota de acesso.
- `app/(public)/page.tsx:57-58` — usa `ProductCarousel` (scroll horizontal via
  `Carousel` do base-ds) para "Produtos populares" e "Mais vendidos"; o
  design pede grid estático. `ProductGrid` (`components/product/ProductGrid.tsx`)
  já implementa exatamente esse grid responsivo e já é usado/testado no
  catálogo — falta só um wrapper que junte `Heading` + `ProductGrid` e
  esconda a seção inteira quando a lista vier vazia (comportamento que hoje
  vem de graça do `ProductCarousel`, coberto por `home.page.test.tsx`).
- Nenhum componente hoje faz esse wrapper para grid (só existe o de carrossel,
  `ProductCarousel.tsx`).

## 2. Testes a incluir/alterar

- `app/(public)/__tests__/home.page.test.tsx`
  - Remover o teste `'mantém o hero e o botão "Ver catálogo"'`
    (`home.page.test.tsx:59-65`) — a seção deixa de existir.
  - Manter sem alteração os demais 5 testes (produtos populares/mais
    vendidos com `ProductCard`, seção some quando a respectiva API falha,
    banners renderizam antes/junto do restante) — os asserts são por
    `role`/texto, agnósticos a carrossel vs. grid, então continuam válidos
    trocando `ProductCarousel` por `ProductGridSection`.

Não é necessário um arquivo de teste dedicado para o novo
`ProductGridSection` — segue o mesmo precedente de `ProductCarousel.tsx`,
que também não tem teste próprio e é coberto via `home.page.test.tsx`.

## 3. O que entra no projeto

Sem tipos novos (reaproveita `Product`/`Banner` de `@/types`). Sem mudança de
backend ou BFF (`/api/products`, `/api/site/banners` já existentes).

### Componente novo — `components/product/ProductGridSection.tsx`

```tsx
import { Heading } from 'base-ds'
import { ProductGrid } from '@/components/product/ProductGrid'
import type { Product } from '@/types'

interface Props {
  title: string
  products: Product[]
}

export function ProductGridSection({ title, products }: Props) {
  if (products.length === 0) return null

  return (
    <section className="flex flex-col gap-6">
      <Heading as="h2" size="2xl">
        {title}
      </Heading>
      <ProductGrid products={products} />
    </section>
  )
}
```

Espelha `ProductCarousel.tsx` (mesma props, mesmo retorno `null` em lista
vazia), só troca `Carousel` por `ProductGrid`. Sem `"use client"` — não usa
hooks próprios, só compõe `ProductGrid`/`ProductCard`.

### Página alterada — `app/(public)/page.tsx`

- Remove o bloco do hero (linhas 46-54) e os imports que só ele usava
  (`Heading`, `Text`, `IconButton` de `@/components/ui/IconButton`).
- Troca `ProductCarousel` por `ProductGridSection` nos dois usos.
- Envolve banner + as duas seções num container `max-w-7xl` (equivalente ao
  `max-width:1280px` do design; hoje só os grids de produto tinham
  `max-w-5xl`, o banner ficava sem largura máxima própria).

```tsx
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
```

### Fora de escopo

- Grid "Promoções" (categorias com desconto) — precisa de schema novo em
  `Category` (desconto + imagem) ou modelo separado; decisão do usuário foi
  deixar de fora por agora.
- Newsletter — precisa de tabela de assinantes + endpoint novo (`POST
  /site/newsletter` ou similar); decisão do usuário foi deixar de fora por
  agora.
- `ProductCarousel.tsx` continua existindo e em uso na seção "relacionados"
  do detalhe de produto (`app/(public)/catalog/[slug]/page.tsx`) — não é
  removido, só deixa de ser usado na home.
