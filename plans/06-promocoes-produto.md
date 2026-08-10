# Promoções de produto com data de início e fim (frontend)

## Contexto

Complementa `backend/plans/06-promocoes-produto.md`. `ProductResponse` passa a
trazer `effectivePrice`/`onPromotion` já calculados — o frontend só exibe,
não recalcula datas.

## 1. Problemas encontrados

- `components/product/AddToCartButton.tsx` (`price: product.price`) —
  adiciona ao carrinho pelo preço cheio, ignorando promoção ativa.
- `components/product/ProductCard.tsx` (`formattedPrice` a partir de
  `product.price`) — vitrine sempre mostra o preço cheio, sem indicar
  promoção nem preço "de/por".
- `app/(public)/catalog/[slug]/page.tsx` (conforme renomeado em
  `produto-seo.md` — hoje `catalog/[id]/page.tsx`, linhas 60-63,
  `formattedPrice`) — mesma lacuna na página de detalhe.
- `components/forms/ProductForm.tsx` não tem campos de preço promocional
  nem seletor de datas.
- `types/index.ts` (`Product`, linhas 69-84) não tem
  `promotionalPrice`/`promotionStartDate`/`promotionEndDate`/
  `effectivePrice`/`onPromotion`.

## 2. Testes a incluir/alterar

**`components/forms/__tests__/ProductForm.test.tsx`** (estender)

- campos de preço promocional e datas de início/fim renderizam; preencher
  só um dos dois campos de data mostra erro de validação local ("início e
  fim são obrigatórios juntos"); preço promocional maior ou igual ao preço
  normal mostra erro local.

**`components/product/__tests__/ProductCard.test.tsx`** (estender)

- produto com `onPromotion: true` mostra preço original riscado + preço
  promocional em destaque + badge "Promoção".
- produto sem promoção mostra só o preço normal, sem badge (comportamento
  atual preservado).

**`components/product/__tests__/AddToCartButton.test.tsx`** (estender,
arquivo já existe dado que tem teste de reviews)

- produto em promoção → item adicionado ao carrinho usa
  `product.effectivePrice`, não `product.price`.

**`app/(public)/__tests__/catalog.product-detail.page.test.tsx`**
(estender, arquivo já existe)

- produto em promoção → página de detalhe mostra preço "de/por" e badge,
  mesmo tratamento do `ProductCard`.

## 3. O que entra no projeto

### Tipos

`types/index.ts` (`Product`): adiciona `promotionalPrice?: number`,
`promotionStartDate?: string`, `promotionEndDate?: string`,
`effectivePrice: number`, `onPromotion: boolean`.

### Componentes

- `components/product/ProductCard.tsx` — quando `product.onPromotion`,
  mostra `product.price` riscado + `product.effectivePrice` em destaque +
  `Badge` "Promoção" (`base-ds`); senão, comportamento atual (só
  `product.price`) preservado.
- `components/product/AddToCartButton.tsx` — troca `price: product.price`
  por `price: product.effectivePrice`.
- `components/forms/ProductForm.tsx` — nova seção "Promoção" (opcional):
  campo de preço promocional + dois seletores de data/hora (início/fim),
  com a mesma validação client-side descrita nos testes.

### Páginas

- `app/(public)/catalog/[slug]/page.tsx` (`formattedPrice`, linhas 60-63
  do arquivo atual `catalog/[id]/page.tsx`) — mesmo tratamento "de/por" +
  badge do `ProductCard`, reaproveitando os mesmos dados
  (`effectivePrice`/`onPromotion`) já vindos do SSR.
- `app/(public)/catalog/page.tsx` (listagem) — opcional: filtro "Em
  promoção" (checkbox) que passa `onPromotion=true` como query param para
  `GET /catalog/products` (requer o backend aceitar esse filtro — não
  coberto em `promocoes-produto.md`/backend; se for desejado, é um
  acréscimo pequeno ao `CatalogController`/`CatalogService` existentes,
  registrar como follow-up caso o usuário confirme que quer essa busca).
