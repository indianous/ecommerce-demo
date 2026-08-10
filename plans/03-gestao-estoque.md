# Gestão de estoque: rastreabilidade e auditoria (frontend)

## Contexto

Complementa `backend/plans/03-gestao-estoque.md`. `PATCH
/{id}/stock` (valor absoluto, sem motivo) deixa de existir; a UI de estoque
passa a registrar **movimentações** (entrada/saída, com motivo) e mostrar o
**histórico** de cada produto.

## 1. Problemas encontrados

- `app/(employee)/dashboard/stock/StockContent.tsx:1-108` — a tela inteira
  gira em torno de um `<input type="number">` com a quantidade final e um
  botão "Salvar" (`handleSaveStock`, linhas 42-58), chamando o endpoint que
  o plano de backend remove. Precisa virar um fluxo de "registrar
  movimentação" (tipo + motivo + quantidade + nota), não mais edição direta
  da quantidade.
- `types/index.ts:69-84` (`Product`) não muda, mas não existe nenhum tipo
  `StockMovement`/`StockMovementReason` no frontend.
- `app/api/admin/products/[id]/stock/route.ts` (rota atual do `PATCH`,
  presumida a partir do padrão de `app/api/admin/products/*` — confirmar
  antes de remover) some junto com o endpoint de backend removido; precisa
  de rotas novas para movimentações.
- Não existe nenhuma tela de histórico por produto — hoje não há como o
  gestor de estoque (ou quem for auditar) ver as mudanças passadas de um
  produto específico.

## 2. Testes a incluir/alterar

**`components/forms/__tests__/StockMovementForm.test.tsx`** (novo — tem
validação própria: motivo obrigatório e coerente com o tipo, ganha teste
dedicado)

- selecionar tipo `Entrada` e motivo `Perda/Avaria` (que só faz sentido
  para saída) → validação bloqueia o submit com mensagem de erro.
- selecionar `Saída` + `Ajuste` + quantidade → habilita o botão e chama
  `onSubmit` com o payload correto.
- campo de nota é opcional.

**`app/(employee)/dashboard/stock/__tests__/StockContent.test.tsx`** (novo
— hoje a página não tem teste próprio)

- lista produtos com estoque atual; ao registrar uma entrada de 20 unidades
  para um produto, a tabela reflete o novo total após o `POST`.
- registrar uma saída maior que o estoque disponível → toast de erro com a
  mensagem do backend (409), estoque não muda na tela.
- botão/link "Ver histórico" por produto leva à nova tela de movimentações.

**`app/(employee)/dashboard/stock/[id]/__tests__/page.test.tsx`** (novo,
tela de histórico)

- lista movimentações do produto (tipo, motivo, quantidade,
  antes/depois, quem fez, quando), paginada.
- filtro por motivo e por intervalo de datas refaz a busca com os query
  params corretos.

**`app/api/admin/products/[id]/stock-movements/__tests__/route.test.ts`**
(novo, padrão dos demais testes de rota BFF)

- `GET`/`POST` repassam `Authorization`, query params e `status` do
  backend sem alteração.

## 3. O que entra no projeto

### Tipos

`types/index.ts`:

- `export type StockMovementType = 'ENTRY' | 'EXIT'`
- `export type StockMovementReason = 'PURCHASE' | 'ADJUSTMENT' | 'LOSS_DAMAGE' | 'RETURN' | 'SALE' | 'OTHER'`
- `export interface StockMovement { id: string; productId: string; type: StockMovementType; reason: StockMovementReason; quantity: number; quantityBefore: number; quantityAfter: number; note?: string; orderId?: string; actorEmail?: string; createdAt: string }`
- `export interface StockMovementPage { content: StockMovement[]; page: number; size: number; totalElements: number }`

### BFF

- `app/api/admin/products/[id]/stock-movements/route.ts` (novo) — `GET`
  (repassa query params `reason`/`from`/`to`/paginação) e `POST`, proxy
  para `${API}/admin/products/{id}/stock-movements`, seguindo o padrão de
  `app/api/admin/orders/[id]/payment-status/route.ts`.
- Rota antiga de `PATCH .../stock` é removida junto com o endpoint de
  backend.

### Componentes

- `components/forms/StockMovementForm.tsx` (novo, form puro controlado —
  tem validação própria de coerência tipo/motivo, por isso ganha teste
  dedicado) — `Select` de tipo (Entrada/Saída), `Select` de motivo
  (filtrado conforme o tipo escolhido), campo numérico de quantidade,
  `FormField` de nota opcional.

### Páginas

- `app/(employee)/dashboard/stock/StockContent.tsx` — tabela de produtos
  ganha, por linha, um botão "Registrar movimentação" que abre um `Dialog`
  (`base-ds`) com `StockMovementForm`; e um link "Histórico" para a nova
  tela de detalhe. Continua protegida por
  `PermissionGuard(['MANAGE_STOCK'])`.
- `app/(employee)/dashboard/stock/[id]/page.tsx` +
  `StockMovementHistoryContent.tsx` (novos) — tabela paginada de
  `StockMovement` do produto, com filtros de motivo e data, protegida pelo
  mesmo `PermissionGuard(['MANAGE_STOCK'])`.
- Espelhar as duas mudanças acima em
  `app/(admin)/dashboard/admin/stock/` (mesmo padrão de espelhamento
  employee → admin já usado no restante do dashboard).
