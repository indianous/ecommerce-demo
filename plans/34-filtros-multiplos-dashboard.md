# 34 — Filtros de lista do dashboard aceitam múltiplos valores (frontend)

## Contexto

Plano irmão: `backend/plans/34-filtros-multiplos-dashboard.md` (torna os endpoints
capazes de filtrar por lista de valores, `?status=A&status=B`). Este arquivo cobre a
troca de UI: todo filtro de lista hoje single-select (`Select`/botão-toggle) vira um
componente no estilo "filtro de coluna do Excel" — trigger compacto com contador +
popover com checklist + botão "Aplicar" (não filtra sozinho ao marcar, só ao
confirmar — mesmo princípio do plano #33 de não disparar busca sem confirmação
explícita).

Issue aberta pedindo esse componente no `base-ds`:
[indianous/base-ds#29](https://github.com/indianous/base-ds/issues/29). `MultiSelect`
já existe mas não serve bem pra filtro compacto (mostra os selecionados como badges
que crescem dentro do próprio campo, sem passo de "Aplicar" separado). Enquanto a
issue não é resolvida, o componente é local.

## 1. Problemas encontrados

Os mesmos 5 arquivos/7 filtros do plano de backend, do lado do componente usado:

| Arquivo | Filtro(s) hoje | Componente atual |
|---|---|---|
| `app/(employee)/dashboard/products/ProductsContent.tsx` | categoria, disponibilidade | `Select` (2x) |
| `app/(employee)/dashboard/orders/OrdersContent.tsx` (compartilhado admin/employee) | status do pedido | `Select` |
| `app/(employee)/dashboard/change-requests/SolicitacoesContent.tsx` | status da solicitação | 4 `Button` toggle (Todas/Pendentes/Aprovadas/Rejeitadas) |
| `app/(admin)/dashboard/admin/audit-logs/AuditLogsContent.tsx` | tipo de entidade, ação | `Select` (2x) |
| `app/(employee)/dashboard/stock/[id]/StockMovementHistoryContent.tsx` | motivo | `Select` |

Nenhum componente novo existe ainda em `components/ui/` pra isso — precisa ser
criado do zero (`FilterDropdown.tsx`).

## 2. Testes a incluir/alterar

- **`components/ui/__tests__/FilterDropdown.test.tsx`** (novo, componente isolado):
  abre o popover ao clicar no trigger; marcar opções não chama `onApply` até clicar
  em "Aplicar"; "Aplicar" chama `onApply` com os valores marcados e fecha o popover;
  "Selecionar todos"/"Limpar" marcam/desmarcam tudo; clicar fora ou Escape fecha sem
  aplicar (descarta marcação pendente, reabrir mostra o valor já aplicado, não o
  descartado); trigger mostra contador (`Badge` ou texto "(N)") quando `value.length
  > 0`.
- Nos 5 `Content.tsx`: teste novo (ou ajuste do existente, ver plano #32 pra quem já
  ganhou teste na padronização de tabela) cobrindo: selecionar 2 valores + Aplicar
  dispara 1 chamada à API com os 2 valores no query string (`?status=PENDING&status=CONFIRMED`);
  trocar de single-select não filtra mais sozinho (comportamento antigo removido).
- `SolicitacoesContent`: os 4 botões-toggle (Todas/Pendentes/Aprovadas/Rejeitadas)
  saem — vira um único `FilterDropdown` com as 3 opções de status.

## 3. O que entra no projeto

**`components/ui/FilterDropdown.tsx`** (novo), inspirado no dropdown interno do
`MultiSelect` do base-ds (mesmo padrão de `useEffect` com `mousedown` fora do
container fecha o popover, sem portal — `position: relative`/`absolute`, igual o
`MultiSelect` já faz):

```tsx
interface FilterDropdownProps {
  label: string
  options: { value: string; label: string }[]
  value: string[]
  onApply: (next: string[]) => void
}
```

Trigger: `Button variant="outline"` com `label` + `Badge` com a contagem quando
`value.length > 0` + `Icon="ChevronDown"`. Popover: `Checkbox` por opção (estado
local de rascunho, inicializado a partir de `value` toda vez que abre), checkbox
"Selecionar todos" (com `indeterminate` quando parcialmente marcado), botões
"Limpar" e "Aplicar" (`Aplicar` chama `onApply(rascunho)` e fecha).

**Nos 5 `Content.tsx`**: troca de `Select`/botões-toggle por `FilterDropdown`,
estado do filtro vira `string[]` (`useState<string[]>([])`), construção da URL passa
a repetir o param por valor (`value.forEach(v => params.append('status', v))`), igual
ao encoding decidido no plano de backend.

**`ProductsContent.tsx`** ganha 2 `FilterDropdown` (categoria — populado a partir de
`categories` já carregado; disponibilidade — `AVAILABLE`/`UNAVAILABLE`).
**`OrdersContent.tsx`**: 1 `FilterDropdown` (status do pedido, 6 opções).
**`SolicitacoesContent.tsx`**: 1 `FilterDropdown` (status da solicitação, 3 opções),
substitui os 4 botões-toggle atuais.
**`AuditLogsContent.tsx`**: 2 `FilterDropdown` (tipo de entidade, ação).
**`StockMovementHistoryContent.tsx`**: 1 `FilterDropdown` (motivo).

Datas (`from`/`to`) e busca por texto ficam como estão — fora de escopo, só os
filtros de valor fixo (enum/categoria) viram multi-select.
