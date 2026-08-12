# Componente de grid de produtos (frontend)

## Contexto

O grid de produtos (`grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3
lg:grid-cols-4` renderizando `ProductCard`) hoje só existe **inline**,
duplicado em dois arquivos que precisam ficar visualmente idênticos
mas não têm nada garantindo isso:

- `app/(public)/catalog/page.tsx` — grid real com os produtos
- `app/(public)/catalog/loading.tsx` — grid de `ProductCardSkeleton`
  (o loading state do Suspense da mesma rota)

Se alguém mudar `lg:grid-cols-4` para `lg:grid-cols-5` em um dos dois
arquivos, o layout do skeleton diverge do layout real (o usuário vê
o grid "pular" de tamanho quando os dados chegam). Extrair um
componente único elimina essa divergência estruturalmente, não por
convenção.

Outros lugares que já listam produtos (home `(public)/page.tsx`,
seção "relacionados" no detalhe do produto) usam o `Carousel` do
`base-ds` via `ProductCarousel.tsx`, não grid — não entram neste
plano, continuam como estão.

Não existe `Grid` no `base-ds` (confirmado — só existe o `Carousel`
como layout de coleção de itens); o grid continua sendo `div` +
classes Tailwind, só passa a viver em um componente só.

## 1. Problemas encontrados

- `app/(public)/catalog/page.tsx:89` — grid inline
  `<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">`
  mapeando `data.content` para `ProductCard`.
- `app/(public)/catalog/page.tsx:87` — estado vazio como
  `<p className="text-gray-500">Nenhum produto encontrado.</p>` — HTML
  nativo em vez do `Text` do `base-ds` (viola a convenção "base-ds é
  obrigatório" do projeto).
- `app/(public)/catalog/loading.tsx:22-30` — mesmas classes de grid
  duplicadas, mais `ProductCardSkeleton` definido só neste arquivo
  (não reaproveitável).
- Nenhum teste cobre hoje o estado vazio do catálogo
  (`catalog.page.test.tsx` não tem caso para `data.content.length === 0`).

## 2. Testes a incluir/alterar

- `components/product/__tests__/ProductGrid.test.tsx` (novo)
  - renderiza um `ProductCard` por produto da lista (assert por
    `getAllByRole('link')` ou pelo nome do produto, seguindo o padrão
    já usado em `ProductCard.test.tsx`)
  - com `products=[]`, renderiza o texto "Nenhum produto encontrado."
    via `Text` do base-ds (não `<p>` nativo) e nenhum `ProductCard`

- `components/product/__tests__/ProductGridSkeleton.test.tsx` (novo)
  - `role="status"` com `aria-label` "Carregando produtos"
  - renderiza 8 cards de skeleton por padrão (`count` default)
  - `count={4}` renderiza 4 cards

- `app/(public)/catalog/__tests__/loading.test.tsx` (existente) — **sem
  alteração**. Continua passando como está: `CatalogLoading` passa a
  renderizar `<ProductGridSkeleton />` por dentro, mas os asserts são
  por `role`/`aria-label`, agnósticos à estrutura interna.

- `app/(public)/__tests__/catalog.page.test.tsx` (existente) — adiciona
  1 caso novo:
  - `it('mostra "Nenhum produto encontrado." quando a busca não
    retorna produtos')` — mocka `GET /catalog/products` retornando
    `{ ...mockPage, content: [], totalElements: 0 }`, assert
    `screen.getByText('Nenhum produto encontrado.')`.
  - Os demais casos (render de produto, paginação, filtros, sort)
    continuam passando sem alteração — a troca do grid inline por
    `<ProductGrid products={data.content} />` não muda nenhum texto
    ou role já asserido.

## 3. O que entra no projeto

Sem tipos novos (reaproveita `Product` de `@/types`). Sem mudança de
backend ou BFF.

### Componente novo — `components/product/ProductGrid.tsx`

```tsx
import { Text } from 'base-ds'
import { ProductCard } from '@/components/product/ProductCard'
import type { Product } from '@/types'

const GRID_CLASSES = 'grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'

interface Props {
  products: Product[]
}

export function ProductGrid({ products }: Props) {
  if (products.length === 0) {
    return <Text color="muted">Nenhum produto encontrado.</Text>
  }

  return (
    <div className={GRID_CLASSES}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

interface SkeletonProps {
  count?: number
}

export function ProductGridSkeleton({ count = 8 }: SkeletonProps) {
  return (
    <div role="status" aria-label="Carregando produtos" className={GRID_CLASSES}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

function ProductCardSkeleton() {
  // corpo idêntico ao ProductCardSkeleton hoje definido em
  // app/(public)/catalog/loading.tsx — só muda de arquivo
}
```

Sem `"use client"` — `ProductGrid`/`ProductGridSkeleton` não usam hooks
próprios, só compõem `ProductCard` (que já é `"use client"`). Mantém
`CatalogPage` como Server Component sem fronteira nova.

### Páginas alteradas

- `app/(public)/catalog/page.tsx` — remove o `<div className="grid ...">`
  inline e o `<p>` de estado vazio (linhas 86-92), substitui por
  `<ProductGrid products={data.content} />`. Remove o import de
  `ProductCard` (não é mais usado diretamente nesse arquivo).
- `app/(public)/catalog/loading.tsx` — remove `ProductCardSkeleton`,
  `SKELETON_COUNT` e o `<div role="status" ...>` (linhas 6-30),
  substitui por `<ProductGridSkeleton />`.

### Fora de escopo

- `<h1 className="mb-6 text-2xl font-bold">` nos dois arquivos
  continua HTML nativo em vez de `Heading` do base-ds — é o mesmo tipo
  de problema (base-ds obrigatório) mas não é grid, fica pra um plano
  à parte se você quiser.
- Não mexe em `ProductCarousel.tsx`/home/relacionados — usam
  `Carousel`, não grid.
