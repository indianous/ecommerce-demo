# 61 — Gestão de promoções de produtos — frontend

Plano irmão: `backend/plans/61-gestao-de-promocoes.md`. Ele cria
`/admin/promotions`, o filtro `onSale`, a ordenação por preço efetivo e
`/catalog/products/prices`. Este lado depende dele para funcionar de ponta a
ponta. Os testes daqui usam MSW e podem ser escritos antes. É independente do
plano 62 (cupons).

## Contexto

A promoção já existe por produto (preço promocional + início + fim), editada
dentro do `ProductForm`, e a loja mostra o preço riscado. Não há tela para ver
quais promoções estão ativas, agendadas ou encerradas, nem ação para aplicar ou
encerrar várias de uma vez. Na loja, o cliente não consegue filtrar produtos em
promoção, e o carrinho de visitante pode mostrar um preço desatualizado.

### Contrato da API (definido no plano do backend)

| Método e rota | Corpo / query | Resposta |
| --- | --- | --- |
| `GET /admin/promotions` | `?status=ACTIVE\|SCHEDULED\|EXPIRED&page&size` | página de `PromotionListItem` |
| `POST /admin/promotions/bulk` | `{ productIds, type: PERCENT\|FIXED_PRICE, value, startDate, endDate }` | `200 { updated }` · `400` com a lista dos produtos inválidos |
| `POST /admin/promotions/bulk-end` | `{ productIds }` | `200 { updated }` |
| `GET /admin/products` | novo `?promotion=ACTIVE\|SCHEDULED\|NONE` | igual a hoje |
| `GET /catalog/products` | novo `?onSale=true` | igual a hoje |
| `POST /catalog/products/prices` | `{ ids }` | `[{ id, effectivePrice, onPromotion, available }]` |

---

## 1. Problemas encontrados

- **F1** — Não existe tela de promoções no painel. O grupo Catálogo tem Produtos,
  Estoque e Excluídos (`AdminShell.tsx:17-19`, `EmployeeShell.tsx:19-21`).
- **F2** — `ProductsContent.tsx:204`: a `SelectionBar` já tem seleção de linhas,
  mas nenhuma ação (`actions` fica vazio).
- **F3** — Catálogo público (`app/(public)/catalog/page.tsx`): sem filtro "Em
  promoção".
- **F4** — `AddToCartButton.tsx:41` grava `effectivePrice` no carrinho local do
  visitante (`cart.store.ts`, `persist`). Se a promoção começa ou acaba depois,
  o carrinho e o total do checkout mostram um valor antigo até o login. A
  cobrança não é afetada, porque o backend recalcula no pedido, mas o cliente
  vê um valor e paga outro.

---

## 2. Testes a incluir/alterar

### `app/api/admin/promotions/__tests__/route.test.ts` (novo)

- `GET` repassa a query e o `Authorization`.
- `bulk/route.ts` e `bulk-end/route.ts`: repassam o corpo e o `Authorization`, e
  devolvem 400 com a mensagem do backend.

### `app/api/catalog/prices/__tests__/route.test.ts` (novo)

- Repassa os ids e devolve a lista.

### `components/forms/__tests__/PromotionForm.test.tsx` (novo)

O form tem validação própria, então ganha teste separado.

- Alterna entre "Percentual" e "Preço fixo".
- Percentual fora de 1–99 → erro. Preço fixo ≤ 0 → erro.
- Fim antes do início → erro. Datas obrigatórias.
- Com erro, o botão de aplicar fica desabilitado.
- Prévia: com um produto de R$ 100 e 20%, mostra "R$ 80,00".

### `app/(employee)/dashboard/promotions/__tests__/PromotionsContent.test.tsx` (novo)

- Abas "Ativas", "Agendadas", "Encerradas" e "Todas" chamam
  `GET /api/admin/promotions?status=...`.
- Colunas: produto, preço, preço promocional, desconto %, início, fim e situação
  (`Badge`).
- Seleção + "Encerrar promoção" → confirmação → `POST bulk-end` → toast e recarga.
- Seleção + "Alterar período" → abre o `PromotionForm` com os valores atuais.
- Estado vazio por aba.
- Sem `MANAGE_PRODUCTS` → `replace('/dashboard')`.

### `app/(admin)/dashboard/admin/promotions/__tests__/page.test.tsx` (novo)

- A página do admin renderiza o `PromotionsContent`.

### `ProductsContent.test.tsx` (alterar)

- Com produtos selecionados, a `SelectionBar` mostra "Aplicar promoção". Ela abre
  o Dialog com o `PromotionForm`, e aplicar faz `POST /api/admin/promotions/bulk`
  com os ids selecionados.
- 400 com produtos inválidos: toast com a mensagem do backend e o Dialog aberto.
- Novo filtro "Promoção" (Ativa, Agendada, Sem promoção) na listagem.

### Catálogo público

- O `Switch` "Em promoção" adiciona `onSale=true` à URL e preserva `category`,
  `search` e `sort`. `buildCatalogUrl` ganha o parâmetro.

### `stores/__tests__/cart.store.test.ts` (alterar)

- `refreshGuestPrices()`: com itens locais, chama `POST /api/catalog/prices` e
  atualiza `price`. Item `available: false` sai do carrinho, com aviso.
  Autenticado → não faz nada, porque o carrinho vem do servidor.
- `CartContent`/`CheckoutForm` chamam `refreshGuestPrices` ao montar, para
  visitante.

### Menu

- Testes dos shells: item **Promoções** no grupo Catálogo, depois de Produtos. No
  funcionário, só com `MANAGE_PRODUCTS`.

---

## 3. O que entra no projeto

### Tipos

1. **`types/index.ts`**: `PromotionStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED'`,
   `PromotionListItem` (produto resumido + campos da promoção + `discountPercent` +
   `promotionStatus`), `BulkPromotionInput { productIds; type: 'PERCENT' | 'FIXED_PRICE'; value; startDate; endDate }`
   e `ProductPrice { id; effectivePrice; onPromotion; available }`.

### BFF

2. **`app/api/admin/promotions/route.ts`** (`GET`), **`bulk/route.ts`** e
   **`bulk-end/route.ts`** (`POST`).
3. **`app/api/catalog/prices/route.ts`** (`POST`).
4. **`app/api/admin/products/route.ts`**: repassar `promotion`.

### Componentes

5. **`components/forms/PromotionForm.tsx`** (novo, puro e controlado): tipo
   (`Radio`), valor (`NumberInput`), início e fim (`Input type="datetime-local"`,
   como o `ProductForm`), prévia do preço quando há um produto só, erros
   calculados das props, e o botão "Aplicar promoção".
6. **`components/content/dashboard/catalog/PromotionsContent.tsx`** (novo):
   `<Container>` sem `width`, com `PermissionGuard(['MANAGE_PRODUCTS'])`, `Tabs`
   por situação, `Table` com seleção (`useRowSelection` + `SelectionBar` com
   "Alterar período" e "Encerrar promoção"), `Dialog` com o `PromotionForm`,
   `ConfirmDeleteDialog` para encerrar, e `usePaginatedFetch`.
7. **`ProductsContent.tsx`**: ação "Aplicar promoção" na `SelectionBar` e o
   filtro "Promoção" no `FilterDropdown`.
8. **Catálogo**: `CatalogSort` (ou um componente irmão `CatalogOnSaleToggle`) com
   o `Switch` "Em promoção" e `buildCatalogUrl` com `onSale`.
9. **`stores/cart.store.ts`**: `refreshGuestPrices()`. `CartContent` e o checkout
   chamam ao montar.
10. **Menu**: `{ label: 'Promoções', icon: 'BadgePercent', group: CATALOGO }` nos
    dois shells (no funcionário com `perms: ['MANAGE_PRODUCTS']`).

### Páginas

11. **`app/(employee)/dashboard/promotions/page.tsx`** e
    **`app/(admin)/dashboard/admin/promotions/page.tsx`**, com `metadata`.
12. **`app/(public)/catalog/page.tsx`**: lê `onSale` dos `searchParams` e repassa
    para o fetch.

### Verificação

- `npm test`, `npx tsc --noEmit`, lint dos arquivos tocados e `npm run build`
  (o plano cria rotas novas).
- Com o backend do plano irmão no ar, subir o ambiente completo. O usuário confere:
  - aplicar 20% em três produtos pela listagem de produtos;
  - ver as promoções nas abas Ativas e Agendadas e encerrar uma;
  - na loja, "Em promoção" e "menor preço" considerando o preço promocional;
  - carrinho de visitante atualizando o preço depois que a promoção muda.
