# 45 — Seleção múltipla e ações em massa nos Contents de gestão (frontend)

Plano irmão: `backend/plans/45-selecao-multipla-acoes-em-massa.md` (contexto
completo, decisões de escopo, e os 3 endpoints novos de exclusão em lote).

## Estado atual

- As 14 páginas de gestão (`ProductsContent`, `DeletedProductsContent`,
  `CustomersContent`, `EmployeesContent`, `AdminsContent`,
  `EmployeeOrdersContent`, `ShippingContent`, `PaymentsContent`,
  `SolicitacoesContent`, `AuditLogsContent`, `StockContent`,
  `StockMovementHistoryContent`, `ExpiringLotsContent`,
  `ProductReviewsModerationContent`) já seguem o padrão do plano #40:
  `ManagementContentBody` envolvendo uma `Table` do base-ds com um array de
  `columns`. Nenhuma tem seleção de linha hoje.
- `TableColumn.header` agora aceita `ReactNode` — não mais só `string`
  ([base-ds#33](https://github.com/indianous/base-ds/issues/33), fechada
  2026-08-25). O `Checkbox` de "selecionar todos" entra direto no cabeçalho
  da coluna de seleção, não precisa mais de um controle separado fora da
  tabela.
- `useConfirmDelete<T>` (`lib/useConfirmDelete.ts`) já é genérico sobre `T`
  — dá pra usar `T = string[]` (lote de ids) sem nenhuma mudança nesse hook.
  `ConfirmDeleteDialog` (`components/ui/ConfirmDeleteDialog.tsx`) também já
  aceita `description` como string livre — "Remover N funcionários
  selecionados?" funciona sem mudança no componente.

## 1. Problemas encontrados

Nenhum — funcionalidade nova. A limitação do `Table.header` (acima) já foi
resolvida no base-ds antes da implementação começar.

## 2. Testes a incluir/alterar (agrupados por arquivo)

- **Novo `useRowSelection.test.ts`**: `toggle(id)` marca/desmarca um item;
  `selectAll(ids)` marca todos os ids passados (ex.: os da página atual);
  `clear()` esvazia a seleção; `isSelected(id)` reflete o estado atual;
  `selectedCount` reflete o tamanho do conjunto selecionado; trocar de
  página (novo array de itens) não mantém seleção de ids que não estão mais
  na lista atual — a decidir na implementação se seleção deve persistir só
  dentro da página ou entre páginas (proponho: só dentro da página atual,
  mais simples e previsível — seleção zera ao trocar de página).
- **Novo `SelectionBar.test.tsx`**: com `selectedCount=0`, o componente não
  renderiza nada (o controle de "selecionar todos" já vive no cabeçalho da
  tabela, não precisa de placeholder aqui); com `selectedCount>0`, mostra "N
  selecionados" + botão "Limpar seleção" (chama `onClear`) + o que vier em
  `actions` (vazio nas 11 páginas sem ação ainda).
- **Novo `selectionColumn.test.tsx`**: `makeSelectionColumn` gera uma coluna
  cujo `header` é um `Checkbox` — `checked` quando todas as linhas da página
  atual estão selecionadas, `indeterminate` quando só algumas, desmarcado
  quando nenhuma; marcar o checkbox do cabeçalho chama `onToggleAll` com os
  ids da página atual; desmarcar (partindo de "todas selecionadas") chama
  `onToggleAll` com lista vazia.
- **Por página, teste genérico replicado nas 14** (adicionar aos arquivos de
  teste já existentes de cada `*Content.tsx`): cada linha da tabela tem um
  checkbox com `aria-label`/`label` identificando o item (ex.: "Selecionar
  Ana Costa"); marcar um checkbox atualiza o contador na `SelectionBar`; o
  checkbox "Selecionar todos" no cabeçalho da tabela marca todas as linhas
  da página atual, e fica indeterminado com seleção parcial.
- **Nas 3 páginas com ação** (`EmployeesContent.test.tsx`,
  `AdminsContent.test.tsx`, `ProductReviewsModerationContent.test.tsx`,
  casos novos): botão "Excluir selecionados" só aparece com `selectedCount >= 1`;
  clicar abre `ConfirmDeleteDialog` com "N selecionados" na descrição;
  confirmar chama `POST .../bulk-delete` com os ids selecionados; sucesso
  total remove os itens da lista e zera a seleção; sucesso parcial (alguma
  falha no `BulkOperationResult`) remove só os que tiveram sucesso e mostra
  toast/mensagem listando os que falharam e por quê.

## 3. O que entra no projeto

### Tipos (`types/index.ts`)
- Novo `BulkOperationResult`: `{ successCount: number; failures: { id: string; reason: string }[] }`.

### `lib/useRowSelection.ts` (novo)
Hook genérico: recebe nada ou um array de ids "atuais" (pra invalidar seleção
obsoleta ao trocar de página), devolve
`{ selectedIds: Set<string>; toggle(id); selectAll(ids); clear(); isSelected(id); selectedCount }`.

### `components/layout/SelectionBar.tsx` (novo)
Props: `selectedCount`, `onClear`, `actions?: ReactNode`. Não renderiza nada
com `selectedCount === 0` (o "selecionar todos" já vive no cabeçalho da
tabela, ver helper abaixo). Renderizado por cada uma das 14 páginas entre
`ManagementContentHeader` e `ManagementContentBody`.

### `components/layout/selectionColumn.tsx` (novo, helper)
Função `makeSelectionColumn<T>(items: T[], getId, getLabel, selectedIds, onToggle, onToggleAll): TableColumn<T>`
— gera a coluna de checkbox pra prependar em qualquer `columns` array das 14
páginas, sem repetir a definição da coluna em cada arquivo. `header` é um
`Checkbox` de "selecionar todos" real (`base-ds#33` fechada libera
`TableColumn.header: ReactNode`): `checked` quando todos os ids de `items`
estão em `selectedIds`, `indeterminate` quando só parte, `onChange` chama
`onToggleAll` com todos os ids (marcando) ou lista vazia (desmarcando).

### As 14 páginas (`components/content/*.tsx`)
Cada uma: instancia `useRowSelection`, prepend `makeSelectionColumn(...)` no
`columns` (checkbox "selecionar todos" já embutido no cabeçalho da coluna),
renderiza `<SelectionBar selectedCount={...} onClear={...} ... />` antes do
`ManagementContentBody`. Nas 11 sem ação ainda, `actions` fica omitido.

### Nas 3 com ação em massa
- **`EmployeesContent.tsx`**/**`AdminsContent.tsx`**/**`ProductReviewsModerationContent.tsx`**:
  `actions` da `SelectionBar` ganha um botão "Excluir selecionados"
  (`aria-label` dinâmico com a contagem), usando `useConfirmDelete<string[]>`
  + `ConfirmDeleteDialog` (mesmo padrão já usado pra exclusão individual
  nessas telas) chamando o BFF novo.

### BFF (3 rotas novas, proxy simples no padrão dos demais)
- `app/api/admin/employees/bulk-delete/route.ts`
- `app/api/admin/admins/bulk-delete/route.ts`
- `app/api/admin/products/[id]/reviews/bulk-delete/route.ts`
