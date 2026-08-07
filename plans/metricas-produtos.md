# Métricas de produto: populares, mais vendidos e relacionados (frontend)

## Contexto

Complementa `backend/plans/metricas-produtos.md`. Três pontos de UI novos:
seções de destaque na home (populares/mais vendidos), seção "Produtos
relacionados" na página de detalhe, e duas colunas novas na tabela de
produtos do admin. Mais o disparo (client-side) de registro de
visualização quando alguém abre a página de um produto.

## 1. Problemas encontrados

- `app/(public)/page.tsx` — home é só um hero estático (título + botão
  "Ver catálogo"), sem nenhuma vitrine de produtos.
- `app/(public)/catalog/[slug]/page.tsx` (conforme renomeado em
  `produto-seo.md`) não tem seção de produtos relacionados nem dispara
  nenhum registro de visualização — hoje a página é 100% SSR sem nenhuma
  interação client-side além dos componentes de review/carrinho já
  existentes.
- `types/index.ts` (`Product`, linhas 69-84) não tem `viewCount`/
  `soldQuantityLast30Days`.
- `app/(employee)/dashboard/products/ProductsContent.tsx:89-102`
  (array `columns`) só tem nome/categoria/preço/estoque/disponibilidade —
  sem visibilidade das novas métricas pedidas pelo usuário.
- Não existe nenhuma rota BFF para registrar visualização (`POST
  .../views` precisa passar pelo BFF, diferente das leituras públicas de
  catálogo que já vão direto ao backend em SSR — isso aqui é uma mutação
  disparada do browser, cai na regra "frontend nunca chama o backend
  direto" do `CLAUDE.md`).

## 2. Testes a incluir/alterar

**`components/product/__tests__/ProductViewTracker.test.tsx`** (novo — tem
lógica própria de disparo único, ganha teste dedicado)

- monta o componente com um `productId` → dispara exatamente um `POST
  /api/products/{id}/views` (via `fetch`, mockado) ao montar; remonta
  (simulando nova navegação) → dispara de novo (uma visualização por
  carregamento de página, não deduplicado no client).
- falha de rede no `POST` não lança erro nem afeta a renderização da
  página (fire-and-forget).

**`app/(public)/__tests__/home.page.test.tsx`** (novo — hoje a home não
tem teste, é estática)

- SSR: `GET /catalog/products/popular`/`GET /catalog/products/best-selling`
  mockados → renderiza as duas seções com `ProductCard` para cada item.
- uma das duas chamadas falha/retorna vazio → a seção correspondente some
  (sem quebrar a outra nem a página).

**`app/(public)/__tests__/catalog.product-detail.page.test.tsx`** (estender,
arquivo já existe)

- `GET /catalog/products/{id}/related` mockado → renderiza "Produtos
  relacionados" com os itens retornados.
- lista vazia de relacionados → seção não aparece.

**`app/(employee)/dashboard/products/__tests__/ProductsContent.test.tsx`**
(estender, arquivo deve existir dado o tamanho do componente)

- colunas "Visualizações" e "Vendidos (30d)" aparecem na tabela com os
  valores de cada produto.

**`app/api/products/[id]/views/__tests__/route.test.ts`** (novo, padrão
dos demais testes de rota BFF)

- `POST` repassa para `${API}/catalog/products/{id}/views` e devolve o
  `status` do backend (incluindo `429` se o rate limit disparar).

## 3. O que entra no projeto

### Tipos

`types/index.ts` (`Product`, linhas 69-84): adiciona `viewCount: number`,
`soldQuantityLast30Days: number`.

### BFF

- `app/api/products/[id]/views/route.ts` (novo) — `POST`, proxy sem corpo
  para `${API}/catalog/products/{id}/views`, sem exigir
  `Authorization` (endpoint público no backend). Mesmo padrão de proxy
  simples já usado em `app/api/site/settings/metadata/route.ts`, sem
  repasse de header de auth.

### Componentes

- `components/product/ProductViewTracker.tsx` (novo, client component
  "invisível" — só efeito colateral, sem renderizar nada visível) —
  recebe `productId`, dispara `POST /api/products/{id}/views` num
  `useEffect` ao montar, ignorando erro de rede silenciosamente.
- `components/product/ProductCarousel.tsx` (novo, ou reaproveitar um
  layout de grid simples se `base-ds` não tiver carousel — avisar antes de
  implementar rolagem customizada) — recebe uma lista de `Product` e um
  título de seção, renderiza `ProductCard` para cada um; usado tanto na
  home quanto na seção de relacionados.

### Páginas

- `app/(public)/page.tsx` — vira `async function` (SSR), busca `GET
  /catalog/products/popular?limit=8` e `GET
  /catalog/products/best-selling?limit=8` direto do backend
  (`API_INTERNAL_URL`, mesmo padrão SSR de `catalog/page.tsx`), renderiza
  duas seções com `ProductCarousel` abaixo do hero atual (hero
  permanece igual).
- `app/(public)/catalog/[slug]/page.tsx` — busca `GET
  /catalog/products/{id}/related?limit=6` (usando o id já resolvido do
  produto, não o slug) e renderiza `ProductCarousel` com título "Produtos
  relacionados" no fim da página; adiciona `<ProductViewTracker
  productId={product.id} />` no corpo da página (client component dentro
  de página SSR, mesmo padrão já usado por outros componentes
  client-side embutidos em página de servidor, ex.:
  `ProductReviewsSection`).
- `app/(employee)/dashboard/products/ProductsContent.tsx:89-102`
  (`columns`) — adiciona `{ key: 'viewCount', header: 'Visualizações',
  render: (p) => p.viewCount }` e `{ key: 'soldQuantityLast30Days',
  header: 'Vendidos (30d)', render: (p) => p.soldQuantityLast30Days }`.
- Espelhar a mudança de colunas em
  `app/(admin)/dashboard/admin/products/` (mesmo padrão de espelhamento
  employee → admin já usado no restante do dashboard).
