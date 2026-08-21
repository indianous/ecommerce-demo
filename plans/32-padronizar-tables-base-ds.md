# 32 — Padronizar as tabelas do dashboard pro `Table` do base-ds

## Contexto

**Atualização**: issue [indianous/base-ds#28](https://github.com/indianous/base-ds/issues/28)
(linha expansível) **já foi resolvida** — `Table` ganhou a prop `renderExpandedRow`.
`app/(customer)/orders/OrdersContent.tsx` não precisa mais ficar de fora: entra no
mesmo escopo deste plano, usando `renderExpandedRow={(order) => <ItensDoPedido
items={order.items} />}` no lugar do `<React.Fragment>`/segunda `<tr>` manual.

Levantamento de todos os `Content.tsx` do dashboard com `<table>`: 11 arquivos usam
`<table>` nativa; **correção** em relação ao que eu disse antes na conversa —
`components/admin/EmployeeManagementTable.tsx` **já usa** `Table` do base-ds (eu tinha
contado errado, ele tinha caído no grep por causa do nome "Table" no próprio arquivo,
não porque usasse `<table>` nativa) — não faz parte deste plano.

## 1. Problemas encontrados

Tabelas nativas a trocar pelo `Table` do base-ds (`columns`/`data`/`render`):

| Arquivo | Colunas | Ação por linha | Teste hoje |
|---|---|---|---|
| `app/(employee)/dashboard/customers/CustomersContent.tsx` | Nome, E-mail, Ações | Ver detalhe | **nenhum** |
| `app/(employee)/dashboard/stock/StockContent.tsx` | Produto, Categoria, Quantidade, (ações) | Entrada/Saída/Histórico | `app/(employee)/__tests__/stock.page.test.tsx` |
| `app/(employee)/dashboard/change-requests/SolicitacoesContent.tsx` | Pedido, Transição, Solicitado por, Status, Ações | Ver detalhe | **nenhum** |
| `app/(employee)/dashboard/orders/OrdersContent.tsx` | Nº, Cliente, Email, Status, Total, Ações | Ver detalhe | **nenhum** |
| `app/(employee)/dashboard/shipping/ShippingContent.tsx` | Nº, Cliente, Total, Status, Ações | Ver pedido | **nenhum** |
| `app/(employee)/dashboard/payments/PaymentsContent.tsx` | Nº, Cliente, E-mail, Método, Total, Ações | Confirmar/Rejeitar | `app/(employee)/dashboard/payments/__tests__/PaymentsContent.test.tsx` |
| `app/(employee)/dashboard/products/deleted/DeletedProductsContent.tsx` | Nome, Categoria, Excluído em, (ação) | Restaurar | `app/(employee)/__tests__/products.deleted.page.test.tsx` |
| `app/(employee)/dashboard/stock/expiring/ExpiringLotsContent.tsx` | Produto, Lote, Saldo, Validade | — (sem ação) | `app/(employee)/dashboard/stock/expiring/__tests__/page.test.tsx` |
| `app/(employee)/dashboard/stock/[id]/StockMovementHistoryContent.tsx` | Tipo, Motivo, Quantidade, Antes→Depois, Lote, Quem, Quando | — (sem ação) | `app/(employee)/dashboard/stock/[id]/__tests__/page.test.tsx` |
| `app/(employee)/dashboard/orders/[id]/OrderDetailContent.tsx` (tabela "Itens") | Produto, Qtd, Preço unit., Subtotal | — (sem ação) | `app/(employee)/dashboard/orders/[id]/__tests__/OrderDetailContent.test.tsx`, `app/(employee)/__tests__/employee.pedido.detalhe.page.test.tsx` |

**4 dessas 10 telas não têm nenhum teste hoje** (Clientes, Solicitações, Pedidos,
Envios) — na TDD do projeto, a migração delas entra junto com a criação de um arquivo
de teste básico (render, colunas, ação por linha), não só a troca de markup.

**Gap do `Table`**: o estado vazio embutido (`data.length === 0`) mostra `"No data"`
fixo em inglês, sem prop pra customizar. `PaymentsContent`, `DeletedProductsContent`,
`ShippingContent` e `SolicitacoesContent` já guardam a lista vazia ANTES da tabela com
uma mensagem em português (`orders.length === 0 ? <p>...</p> : <table>`) — esse padrão
é replicado nas 6 telas que hoje não têm esse guard (`Customers`, `Stock`,
`OrdersContent` employee, `ExpiringLots`, `StockMovementHistory`,
`OrderDetailContent`), evitando que o "No data" em inglês apareça. Não abri issue nova
pra isso — é o mesmo padrão que 4 telas já usam, não uma limitação nova.

**`onSort`**: nenhuma das 11 tabelas ordena hoje. `Table.onSort(key, direction)` só
dispara o callback e mostra o indicador (▲/▼) — quem reordena `data` é o consumidor.
Como nenhum fetch existente manda `?sort=` pro backend, a ordenação entra como
client-side (reordenar o array já carregado em `state`, ver seção 3) nas colunas onde
faz sentido comparar (texto/data/número) — não em colunas com só ação/ícone.

## 2. Testes a incluir/alterar

- **Novos arquivos de teste** (4): `CustomersContent`, `SolicitacoesContent`,
  `OrdersContent` (employee, lista), `ShippingContent` — cobrir: renderiza heading,
  chama a API certa, mostra as colunas/linhas a partir da resposta mockada (MSW), botão
  de ação por linha (clique → `router.push`/callback certo), estado vazio mostra a
  mensagem em português (não "No data").
- **Testes existentes** (`stock.page.test.tsx`, `PaymentsContent.test.tsx`,
  `products.deleted.page.test.tsx`, `stock/expiring/__tests__/page.test.tsx`,
  `stock/[id]/__tests__/page.test.tsx`, `OrderDetailContent.test.tsx`,
  `employee.pedido.detalhe.page.test.tsx`) — regressão: `Table` do base-ds preserva os
  roles ARIA nativos (`table`/`columnheader`/`row`/`cell`), então
  `getByRole('table')`/`getByRole('columnheader', {name})`/`getByRole('cell', {name})`
  devem continuar passando sem mudança. Ajustar só o que quebrar de fato ao rodar
  (esperado: pouca coisa, já que a troca é estrutural, não de conteúdo) — seguir o
  mesmo processo iterativo dos planos #28-#31 (rodar, ver o que falha, corrigir a
  query).
- Colunas que ganharem `sortable: true` (seção 3) precisam de um teste novo por
  tabela: clicar no cabeçalho reordena as linhas (asc na primeira vez, desc na
  segunda).

## 3. O que entra no projeto

Trocar cada `<table>` nativa por `<Table columns={...} data={...} />`, seguindo o
padrão já usado em `EmployeeManagementTable.tsx`/`ProductsContent.tsx`: `columns` como
array de `TableColumn<T>` com `render` pra células com Badge/Button/formatação, ação
por linha na última coluna sem `sortable`.

Colunas que ganham `sortable: true` + `onSort` (reordenação client-side, no mesmo
molde do exemplo já mostrado nesta conversa):

- `CustomersContent`: Nome
- `StockContent`: Produto, Quantidade
- `SolicitacoesContent`: Pedido, Status
- `OrdersContent` (employee): Nº, Total, Status
- `ShippingContent`: Nº, Total
- `PaymentsContent`: Nº, Total
- `DeletedProductsContent`: Nome, Excluído em
- `ExpiringLotsContent`: Produto, Saldo, Validade
- `StockMovementHistoryContent`: Quantidade, Quando
- `OrderDetailContent` (tabela Itens): não — ordem dos itens do pedido é a ordem de
  compra, não faz sentido reordenar

Colunas de ação/ícone (Ações, botões) nunca ganham `sortable`.

Cada `Content.tsx` migrado ganha o guard `data.length === 0 ? <Text>...</Text> :
<Table .../>` com a mesma mensagem em português que já existe nas telas (ou uma nova,
nas que não tinham nenhuma).

`app/(customer)/orders/OrdersContent.tsx` entra no escopo (ver Atualização no topo):
`Table` com `renderExpandedRow` no lugar da segunda `<tr>` manual; sem `sortable`
(ordem de exibição é a ordem de compra).
