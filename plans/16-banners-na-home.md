# Exibição dos banners cadastrados na home (frontend)

## Contexto

Banners já são **totalmente gerenciáveis** hoje — upload, link e
remoção via `SiteContent.tsx` → `BannerForm.tsx` → `POST/DELETE
/api/site/banners` → backend (`BannerController`,
`bannerRepository.findAllByActiveTrueOrderByPositionAsc()`). O que
falta é só o **consumo público**: a home (`app/(public)/page.tsx`) não
busca nem renderiza banner nenhum hoje — só hero (heading + CTA "Ver
catálogo") e dois `ProductCarousel` ("Produtos populares", "Mais
vendidos").

Backend e BFF não precisam de nenhuma mudança:
`GET /api/v1/site/banners` já é público (sem `@PreAuthorize`), já
retorna só banners `active=true` ordenados por `position`. O padrão
já estabelecido nesse mesmo arquivo (`fetchProducts` em
`app/(public)/page.tsx`, e o mesmo em `catalog/page.tsx` e
`catalog/[slug]/page.tsx`) é o Server Component buscar
**direto no backend** (`${API_INTERNAL_URL}/...`), não via rota BFF —
a rota BFF `/api/site/banners` existente é para o client component
`SiteContent.tsx` (que precisa reenviar `Authorization` no
POST/DELETE). A busca nova segue o mesmo padrão direto.

Não existe `title`/`alt` cadastrável pro banner — `BannerResponse`
só tem `id`, `imageUrl`, `linkUrl`, `position`. Vou usar um `alt`
genérico ("Banner promocional") por enquanto; um campo de texto
alternativo próprio ficaria pra um plano à parte (mudança de schema,
fora do escopo de "exibir o que já existe").

`Carousel` do base-ds (mesmo componente que `ProductCarousel.tsx` já
usa) não tem autoplay nem `index` controlado — só `showArrows`/
`showDots`/`loop`. Os banners vão ficar com navegação manual (arrows +
dots), igual ao carrossel de produtos já hoje. Autoplay ficaria fora
de escopo — dependeria de pedido novo no `base-ds`.

## 1. Problemas encontrados

- `app/(public)/page.tsx` — não busca `GET /site/banners`, não
  renderiza nenhum banner. É a única lacuna real; o resto da cadeia
  (backend, BFF, tipo `Banner` em `types/index.ts`, admin) já existe.
- `types/index.ts:72-77` — `Banner.linkUrl: string | null`, sem campo
  de texto alternativo (ver Contexto).
- Nenhum componente de exibição pública de banner existe hoje — só o
  form de cadastro (`BannerForm.tsx`) e a lista de gerenciamento
  dentro do `Dialog` de `SiteContent.tsx` (que usa `<img>` nativo, não
  o `Image` do base-ds — reforça que não há precedente de exibição
  pública ainda).

## 2. Testes a incluir/alterar

- `components/site/__tests__/BannerCarousel.test.tsx` (novo)
  - renderiza uma imagem por banner (`alt="Banner promocional"`)
  - banner com `linkUrl` preenchido: imagem fica dentro de um
    `getByRole('link')` com `href` igual ao `linkUrl`
  - banner com `linkUrl: null`: imagem renderiza **sem** wrapper de
    link (não gera `<a>` sem `href`)
  - `banners=[]` → componente não renderiza nada (`container` vazio),
    mesma regra de "sem dado, sem seção" que `ProductCarousel` já
    segue

- `app/(public)/__tests__/home.page.test.tsx` (existente)
  - adiciona `http.get('http://localhost:8080/api/v1/site/banners',
    () => HttpResponse.json([]))` nos handlers padrão do `server`,
    pra não gerar unhandled-request nos 4 testes já existentes (que
    não precisam saber de banner)
  - novo teste: com 2 banners mockados, a home renderiza as 2 imagens
    (por `alt`) antes/junto do hero, sem quebrar as seções de produtos
  - novo teste: `GET /site/banners` retornando `[]` ou erro 500 → home
    renderiza normalmente (hero + carrosséis de produto), sem nenhum
    vestígio de carrossel de banner — mesmo padrão de degradação
    graciosa que os testes de "populares"/"mais vendidos" já cobrem

## 3. O que entra no projeto

Sem tipos novos (reaproveita `Banner` de `@/types`, já completo). Sem
mudança de backend ou BFF.

### Componente novo — `components/site/BannerCarousel.tsx`

```tsx
import { Carousel, Image } from 'base-ds'
import type { Banner } from '@/types'

interface Props {
  banners: Banner[]
}

export function BannerCarousel({ banners }: Props) {
  if (banners.length === 0) return null

  return (
    <Carousel
      loop
      items={banners.map((banner) => {
        const image = (
          <Image
            src={banner.imageUrl}
            alt="Banner promocional"
            aspectRatio="video"
            objectFit="cover"
            className="w-full rounded-lg"
          />
        )
        return banner.linkUrl ? (
          <a key={banner.id} href={banner.linkUrl} className="block w-full">
            {image}
          </a>
        ) : (
          <div key={banner.id} className="w-full">
            {image}
          </div>
        )
      })}
    />
  )
}
```

Sem `"use client"` — só compõe `Carousel`/`Image` do base-ds, mesma
lógica de `ProductCarousel.tsx`.

### `app/(public)/page.tsx` — alterações

- Novo `fetchBanners()`, mesmo padrão de `fetchProducts()` já no
  arquivo:

```ts
async function fetchBanners(): Promise<Banner[]> {
  try {
    const res = await fetch(`${API}/site/banners`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}
```

- `Promise.all` do `Home()` ganha `fetchBanners()` junto de
  `fetchProducts('popular')`/`fetchProducts('best-selling')`.
- `<BannerCarousel banners={banners} />` renderizado **acima** do
  bloco de hero atual (heading + texto + botão "Ver catálogo"),
  full-width dentro do container existente. Import de `Banner` de
  `@/types` e de `BannerCarousel` de `@/components/site/BannerCarousel`.

### Fora de escopo

- Autoplay do carrossel — `Carousel` do base-ds não suporta hoje (ver
  Contexto); pediria issue nova no `base-ds`.
- Reordenar banners — `BannerController` não tem endpoint de reorder
  (posição é só incremento automático na criação); gerenciamento de
  banner continua como está, este plano é só sobre exibição pública.
- Campo de texto alternativo (`alt`) próprio por banner — precisaria
  de coluna nova em `Banner`/`BannerResponse`, fora do escopo de só
  exibir o que já existe.
