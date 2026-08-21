# 33 — Busca por texto no dashboard só dispara no botão, não a cada tecla

## Contexto

Levantei todos os campos de busca por texto livre nas telas do dashboard
(`grep` por `type="search"`/`placeholder="Buscar..."` em `app/(employee)/dashboard` e
`app/(admin)/dashboard`) — só existem 4, todos no employee (nenhum no admin).

## 1. Problemas encontrados

| Arquivo | Comportamento hoje |
|---|---|
| `components/customers/CustomersContent.tsx` (`app/(employee)/dashboard/customers/`) | **Já correto** — `<form onSubmit={handleSearch}>` com botão de busca (`Icon="Search"`), `fetchCustomers(q)` recebe o termo como parâmetro explícito, só chamado no submit. Referência de padrão pros outros três. |
| `app/(employee)/dashboard/products/ProductsContent.tsx` | Busca a cada tecla — `fetchProducts` é `useCallback` com `search` nas deps (`[accessToken, search, categoryId, statusFilter]`), disparado por `useEffect(() => { fetchProducts() }, [fetchProducts])`. Sem form, sem botão de busca — só o `<Input type="search">`. |
| `app/(employee)/dashboard/orders/OrdersContent.tsx` | Mesmo problema — `fetchOrders` com `search` nas deps, sem form/botão. |
| `app/(employee)/dashboard/change-requests/SolicitacoesContent.tsx` | Mesmo problema — `fetchRequests` com `search` nas deps, sem form/botão. |

Nenhuma das 4 tem teste hoje (confirmado no levantamento do plano #32) — a correção
das 3 entra junto com teste novo, não só a mudança de comportamento.

**Fora de escopo, de propósito**: os filtros por `Select`/botão-toggle (categoria e
disponibilidade em `ProductsContent`, status em `OrdersContent`/`SolicitacoesContent`)
continuam aplicando na hora, sem botão — o pedido foi especificamente sobre busca por
**input de texto**, e mudar de opção num dropdown ou clicar num botão de filtro já é
uma ação discreta e deliberada, diferente de digitar. Selects/toggles ficam como estão.

## 2. Testes a incluir/alterar

Um arquivo de teste novo por página (`ProductsContent.test.tsx`,
`OrdersContent.test.tsx` em `app/(employee)/dashboard/orders/__tests__/`,
`SolicitacoesContent.test.tsx`), cobrindo pelo menos:

- digitar no campo de busca **não** dispara nova chamada à API (mock de fetch/MSW
  contando as chamadas antes/depois de `user.type(...)`).
- clicar no botão de busca (ou dar submit no form / Enter no campo) dispara a chamada
  com o termo digitado no query param certo (`?search=...`).
- filtro por `Select`/botão continua aplicando imediatamente ao trocar (regressão do
  comportamento atual, que não muda).

## 3. O que entra no projeto

Nas 3 páginas, replicar o padrão já usado em `CustomersContent.tsx`:

- `fetchX` passa a receber o termo de busca como parâmetro explícito
  (`fetchProducts(searchTerm: string)` etc.) em vez de ler `search` do closure —
  remove `search` do array de dependências do `useCallback` (mantém `categoryId`/
  `statusFilter`, que devem continuar reativos).
- `<Input>` de busca entra num `<form onSubmit={handleSearch}>` com um
  `Button iconOnly` (`Icon="Search"`, `type="submit"`) ao lado — igual ao
  `CustomersContent.tsx` — chamando `fetchX(search)`.
- `useEffect` de carga inicial passa a chamar `fetchX(search)` (valor inicial vazio),
  com deps `[fetchX]` apenas — segue sem reagir a mudança de `search` em si.
