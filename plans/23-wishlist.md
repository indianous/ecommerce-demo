# Wishlist / favoritos (frontend)

## Contexto

Par do plano de backend [[23-wishlist]]. Duas pontas: (1) botão de
favoritar no catálogo/detalhe do produto, pro cliente gerar dado de
verdade; (2) seção "Favoritos" na tela de detalhe do cliente no admin.

## 1. Problemas encontrados

- Não existe `stores/wishlist.store.ts` nem equivalente — favoritos não
  existem no frontend hoje.
- `components/product/ProductCard.tsx` não tem botão de favoritar (só tem
  o de adicionar ao carrinho).
- `app/(public)/catalog/[slug]/page.tsx` (detalhe do produto) também não
  tem.
- `app/(employee)/dashboard/customers/[id]/CustomerDetailContent.tsx` não
  tem seção de favoritos.
- Precisa checar se `base-ds` tem um ícone de coração
  (`Icon name="Heart"`) — `Icon` já é usado via
  `x-import`/`IconButton` em vários lugares (`ProductCard` usa
  `ShoppingCart`), então é questão de conferir se `Heart` existe no set de
  ícones antes de implementar; se não existir, é caso de abrir issue no
  `base-ds` antes de fazer workaround local, pela convenção do projeto.

## 2. Testes a incluir/alterar

- `components/product/__tests__/ProductCard.test.tsx` (existente) — novos
  casos: clique no botão de favoritar chama `POST /api/wishlist/{id}`;
  produto já favoritado (`isWishlisted: true`) renderiza o ícone no estado
  "preenchido"; clique de novo chama `DELETE` e volta pro estado vazio
  (toggle otimista).
- `app/(employee)/__tests__/customers.detail.page.test.tsx` (o mesmo já
  citado nas fases 1/2) — novo caso: lista produtos favoritados com nome,
  preço e data; lista vazia mostra "Nenhum favorito ainda."

## 3. O que entra no projeto

### BFF — novo `app/api/wishlist/route.ts` + `app/api/wishlist/[productId]/route.ts`

- `GET` proxy pra `GET /wishlist`.
- `POST`/`DELETE` em `[productId]/route.ts` proxy pra
  `POST`/`DELETE /wishlist/{productId}` — mesmo padrão dos outros BFF
  routes do projeto (repassa `Authorization`, repassa status code).

### Tipos — `types/index.ts`

```ts
// em Product:
isWishlisted?: boolean

export interface WishlistItem {
  productId: string
  productName: string
  imageUrl: string | null
  price: number
  addedAt: string
}
```

### `components/product/ProductCard.tsx`

- Botão de favoritar (ícone coração) ao lado/próximo do botão de carrinho,
  usando o mesmo padrão de estado otimista que `AddToCartButton.tsx` já
  usa pro carrinho — chama a API, reverte se falhar, mostra toast de erro.
  Só aparece pra usuário autenticado (anônimo não favorita — mesma regra
  do backend).

### `app/(employee)/dashboard/customers/[id]/CustomerDetailContent.tsx`

- Nova seção "Favoritos": grid/lista simples com imagem pequena, nome,
  preço e data de quando favoritou — sem botão de ação (é visão do admin
  sobre o cliente, não uma wishlist editável por ele).

### Fora de escopo

- Não cria uma página "Meus favoritos" pro cliente ver a própria wishlist
  — não foi pedido; o botão no `ProductCard` é o suficiente pra gerar o
  dado que a tela do admin precisa. Se quiser essa página depois, é
  extensão pequena (reaproveita o mesmo `GET /api/wishlist`).
