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

**Atualização 2026-08-22 (revisão de escopo — todos os `Content.tsx` da aplicação)**:
depois dos 11 arquivos acima migrados e commitados, revisei os 33 `Content.tsx` de
todo o frontend (não só o dashboard) procurando por `<table>` nativa OU `Table` do
base-ds sem o padrão que este plano estabeleceu (sortable nas colunas que fazem
sentido + guard de lista vazia em português). Resultado: nenhuma `<table>` nativa
sobrou, mas **3 pontos que já usavam `Table` antes deste plano existir ficaram pra
trás** e não seguem o padrão — entram no escopo agora:

- **`app/(employee)/dashboard/products/ProductsContent.tsx`** (Gestão de Produtos) —
  sem `sortable` em nenhuma coluna e sem guard de lista vazia (lista zerada cairia no
  "No data" em inglês do `Table`). Era o exemplo citado na seção 3 original como
  "padrão a seguir", mas ele mesmo não tinha o padrão completo.
- **`components/admin/EmployeeManagementTable.tsx`** (compartilhado por
  `app/(admin)/dashboard/admin/employees/EmployeesContent.tsx` e
  `app/(employee)/dashboard/employees/EmployeesContent.tsx`) — mesmos dois gaps: sem
  `sortable`, sem guard de lista vazia.
- **`app/(admin)/dashboard/admin/audit-logs/AuditLogsContent.tsx`** — já tem guard de
  lista vazia, mas com `<p>` nativo em vez de `Text` do base-ds (inconsistente com o
  padrão adotado nas outras 11 telas); sem `sortable` em nenhuma coluna.

**Revisado e já conforme, sem mudança**: `app/(customer)/cart/CartContent.tsx` — usa
`Table` com guard de lista vazia via `Text` e, corretamente, sem `sortable` (ordem dos
itens do carrinho é a ordem em que foram adicionados, mesma lógica de
`OrderDetailContent`/pedidos do cliente).

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

**Os 3 pontos da revisão de escopo (ver Atualização 2026-08-22)**:

| Arquivo | Colunas | Gap | Teste hoje |
|---|---|---|---|
| `ProductsContent.tsx` | Nome, Categoria, Preço, Estoque, Visualizações, Vendidos (30d), Disponibilidade, Ações | sem `sortable`, sem guard de lista vazia | `app/(employee)/__tests__/products.page.test.tsx` |
| `EmployeeManagementTable.tsx` | Nome, E-mail, Ações | sem `sortable`, sem guard de lista vazia | `components/admin/__tests__/EmployeeManagementTable.test.tsx` |
| `AuditLogsContent.tsx` | Tipo, ID da Entidade, Ação, Ator, Perfil, Data | sem `sortable`; guard de lista vazia existe mas usa `<p>` em vez de `Text` do base-ds | `app/(admin)/dashboard/admin/audit-logs/__tests__/page.test.tsx` |

`EmployeeManagementTable` é usado por dois `EmployeesContent.tsx` (admin e employee) —
nenhum dos dois tem teste de página hoje (confirmado também no plano #36); o teste do
componente compartilhado (`EmployeeManagementTable.test.tsx`) é quem cobre o
comportamento da tabela em si.

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
- **Testes existentes dos 3 pontos da revisão de escopo** (`products.page.test.tsx`,
  `EmployeeManagementTable.test.tsx`, `audit-logs/__tests__/page.test.tsx`) — mesma
  regra de regressão acima (roles ARIA preservados), mais teste novo de `sortable` por
  coluna que ganhar a prop, e teste do guard de lista vazia
  (`ProductsContent`/`EmployeeManagementTable`, que hoje não têm nenhum) mostrando a
  mensagem em português em vez do "No data" do `Table`.
- `AuditLogsContent`: ajustar a asserção existente de `/nenhum log encontrado/i` (linha
  78 do teste) só se a troca de `<p>` por `Text` mudar o role/estrutura do elemento —
  `Text` do base-ds renderiza `<p>` por padrão, então é esperado que a query por texto
  continue passando sem mudança.

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

**Os 3 pontos da revisão de escopo** (ver Atualização 2026-08-22), pra ficarem no
mesmo padrão das outras 12 telas:

- **`ProductsContent.tsx`**: `sortable: true` em Nome, Preço, Estoque, Visualizações e
  Vendidos (30d) — colunas de texto/número onde ordenar é útil pro time de produto
  (ex.: achar o mais vendido/mais visto rápido). Categoria fica sem `sortable` (é um
  lookup derivado, `categories[0]?.name`, mesmo critério usado pra não tornar
  `Categoria` sortable em `StockContent`). Disponibilidade (Badge) também sem
  `sortable` — já é filtrável pelo `Select` ao lado. Ganha o guard
  `products.length === 0 ? <Text>Nenhum produto encontrado.</Text> : <Table .../>`.
- **`EmployeeManagementTable.tsx`**: `sortable: true` em Nome e E-mail (as duas únicas
  colunas de dado, ambas string). Ganha o guard
  `employees.length === 0 ? <Text>Nenhum funcionário cadastrado.</Text> : <Table
  .../>` (mensagem igual nos dois `EmployeesContent.tsx` que consomem o componente,
  já que o guard fica dentro do componente compartilhado).
- **`AuditLogsContent.tsx`**: `sortable: true` em Tipo, Ação, Ator e Data (as 4 colunas
  onde ordenar ajuda a auditar — ID da Entidade é UUID, sem sortable; Perfil fica de
  fora por ser um valor quase sempre igual ao filtro de Ação já aplicado). Troca o
  `<p>Nenhum log encontrado.</p>` por `<Text size="sm" color="muted">Nenhum log
  encontrado.</Text>`, igual ao padrão das outras telas.

Colunas de ação/ícone continuam nunca ganhando `sortable`, valendo também pros 3
pontos acima.
