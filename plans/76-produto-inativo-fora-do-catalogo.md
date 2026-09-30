# 76 — Produto inativo fora do GET público por id — frontend

Resolve, junto com o backend, a issue **#19** do `ecommerce-backend`. Plano irmão:
`backend/plans/76-produto-inativo-fora-do-catalogo.md`. Lá, `GET /catalog/products/{id}` passa a devolver 404 para
produto excluído, e entra a rota `GET /admin/products/{id}` (admin, `MANAGE_PRODUCTS` ou `MANAGE_STOCK`).

## Contexto

O BFF `GET /api/admin/products/[id]` faz proxy para o endpoint **público** `/catalog/products/{id}` e descarta o
token. A edição de produto (`ProductEditContent`) e o histórico de estoque (`StockMovementHistoryContent`) leem o
produto por essa rota com `authFetch`, que já manda o `Authorization`. Com o backend novo, um produto excluído
deixaria de abrir nessas telas.

A página da loja (`app/(public)/catalog/[slug]/page.tsx`) tenta o slug e, se não achar, o UUID. Para um excluído, o
UUID passa a receber 404 e a página cai no `notFound()` que já existe. Nada muda nela.

### Decisões

- Só o `GET` do BFF muda: ele passa a chamar `/admin/products/{id}` repassando o `Authorization`, como já fazem o
  `PUT` e o `DELETE` do mesmo arquivo.
- As telas não mudam: o `authFetch` já manda o token.

## 1. Problemas encontrados

| Arquivo | Linha | Diagnóstico |
| --- | --- | --- |
| `app/api/admin/products/[id]/route.ts` | 6–15 | O `GET` chama o catálogo público e não repassa o token |
| `app/api/admin/products/[id]/__tests__/` | — | Não há teste de rota para o `GET`, o `PUT` ou o `DELETE` |

## 2. Testes a incluir/alterar

### `app/api/admin/products/[id]/__tests__/route.test.ts` (novo, no padrão de `stock-lots/__tests__/route.test.ts`)

1. `GET` chama `/admin/products/prod-1` (e não `/catalog/products/prod-1`), repassa o `Authorization` e devolve
   status e corpo do backend.
2. `GET` com 404 do backend devolve 404.
3. `GET` com 403 do backend devolve 403.

Os testes das telas (`products.edit.page.test.tsx`, `stock/[id]/__tests__/page.test.tsx`) mocam
`/api/admin/products/:id` pelo MSW e não mudam.

## 3. O que entra no projeto

### BFF

1. `app/api/admin/products/[id]/route.ts`: o `GET` lê o `Authorization` do request e chama
   `${API}/admin/products/${id}` com ele, com `proxyJson(res)` como hoje.

Nenhuma mudança em tipos, componentes ou páginas.

## Verificação

- `npx vitest run`, `npx tsc --noEmit` e `npm run build` (o plano não mexe em rotas de página, mas a rota do BFF
  muda).
- Manual: igual ao plano irmão.
