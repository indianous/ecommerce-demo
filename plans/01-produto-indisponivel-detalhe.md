# Produto indisponível não deve 404 na página de detalhe

Contexto: o link "ver produto" adicionado ao histórico de pedidos do cliente
(`app/(customer)/orders/page.tsx`) aponta para `/catalog/{productId}`. Quando o
produto foi desativado depois da compra, o cliente recebe um 404 genérico em vez
de ver que o produto foi descontinuado. Depende da mudança de backend em
`backend/plans/01-produto-indisponivel-detalhe.md` (que passa a retornar 200 com
`active: false` em vez de 404 para produto inativo).

## 1. Problemas encontrados

- `components/product/AddToCartButton.tsx:13-21` — só verifica `stockQuantity > 0`.
  Não existe checagem para `product.active === false` ou
  `product.status === 'UNAVAILABLE'`. Hoje isso nunca é exercitado porque o
  backend bloqueia com 404 antes; ao corrigir o backend, esse componente passa a
  receber produtos inativos e precisa impedir a compra.
- `app/(public)/catalog/[id]/page.tsx` — nenhuma mudança estrutural necessária:
  já delega a decisão de compra para `AddToCartButton`, e `notFound()` (linha 56)
  continua correto para produto realmente inexistente.

## 2. Testes a incluir/alterar

**`components/product/__tests__/AddToCartButton.test.tsx`**
- Novo teste, no mesmo padrão do existente `'mostra "Sem estoque"...'` (linha 62):
  quando `product.active === false` (ou `status === 'UNAVAILABLE'`), renderiza
  `Badge` com texto "Produto indisponível" e não renderiza o botão "Adicionar ao
  carrinho".

**`app/(public)/__tests__/catalog.product-detail.page.test.tsx`**
- Novo teste: handler MSW retornando produto com `active: false`/
  `status: 'UNAVAILABLE'` — a página renderiza normalmente (sem `notFound()`/erro)
  e não exibe o botão "Adicionar ao carrinho".

## 3. O que entra no projeto

- **Tipos**: nenhuma alteração — `Product` (`types/index.ts`) já tem `active` e
  `status`.
- **BFF**: nenhuma alteração — a página busca o produto direto do backend em
  Server Component (`fetch(`${API}/catalog/products/${id}`)`).
- **Componentes**: `components/product/AddToCartButton.tsx` — adicionar checagem
  de indisponibilidade (`!product.active || product.status === 'UNAVAILABLE'`)
  antes da checagem de estoque, renderizando
  `<Badge variant="danger" size="sm">Produto indisponível</Badge>`, seguindo o
  mesmo padrão já usado para "Sem estoque".
- **Páginas**: nenhuma mudança em `app/(public)/catalog/[id]/page.tsx`.
