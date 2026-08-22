# 34 — Filtros de lista do dashboard aceitam múltiplos valores (frontend)

## Contexto

Plano irmão: `backend/plans/34-filtros-multiplos-dashboard.md` (torna os endpoints
capazes de filtrar por lista de valores, `?status=A&status=B`). Este arquivo cobre a
troca de UI: todo filtro de lista hoje single-select (`Select`/botão-toggle) vira um
componente no estilo "filtro de coluna do Excel" — trigger compacto com contador +
popover com checklist + botão "Aplicar" (não filtra sozinho ao marcar, só ao
confirmar — mesmo princípio do plano #33 de não disparar busca sem confirmação
explícita).

**Atualização 2026-08-22**: [indianous/base-ds#29](https://github.com/indianous/base-ds/issues/29)
foi fechada — `base-ds` ganhou um componente `FilterDropdown` nativo
(`src/components/molecules/FilterDropdown/FilterDropdown.tsx`), com assinatura
idêntica à pedida na issue: `label`, `options: { value, label }[]`, `value: string[]`,
`onApply(next: string[])`, mais `align?`, `disabled?`, `className?` de bônus. Não há
mais motivo pra construir um componente local — todo o plano abaixo passa a ser
"importar `FilterDropdown` de `base-ds`" em vez de "criar `components/ui/FilterDropdown.tsx`".
`MultiSelect` continua não servindo pro caso (badges crescendo no campo, sem passo de
"Aplicar"), mas isso não importa mais: o componente certo já existe pronto.

## 1. Problemas encontrados

Os mesmos 5 arquivos/7 filtros do plano de backend, do lado do componente usado:

| Arquivo | Filtro(s) hoje | Componente atual |
|---|---|---|
| `app/(employee)/dashboard/products/ProductsContent.tsx` | categoria, disponibilidade | `Select` (2x) |
| `app/(employee)/dashboard/orders/OrdersContent.tsx` (compartilhado admin/employee) | status do pedido | `Select` |
| `app/(employee)/dashboard/change-requests/SolicitacoesContent.tsx` | status da solicitação | 4 `Button` toggle (Todas/Pendentes/Aprovadas/Rejeitadas) |
| `app/(admin)/dashboard/admin/audit-logs/AuditLogsContent.tsx` | tipo de entidade, ação | `Select` (2x) |
| `app/(employee)/dashboard/stock/[id]/StockMovementHistoryContent.tsx` | motivo | `Select` |

Nenhum componente local precisa ser criado — `FilterDropdown` já existe em `base-ds`
(ver atualização acima) e cobre exatamente esses 5 arquivos/7 filtros.

## 2. Testes a incluir/alterar

Sem teste de componente isolado — `FilterDropdown` é do `base-ds`, já testado lá
(comportamento de popover, "Aplicar"/"Selecionar todos"/"Limpar", Escape/clique fora
descartando rascunho fazem parte do próprio pacote).

- Nos 5 `Content.tsx`: teste novo (ou ajuste do existente, ver plano #32 pra quem já
  ganhou teste na padronização de tabela) cobrindo: selecionar 2 valores + Aplicar
  dispara 1 chamada à API com os 2 valores no query string (`?status=PENDING&status=CONFIRMED`);
  trocar de single-select não filtra mais sozinho (comportamento antigo removido).
- `SolicitacoesContent`: os 4 botões-toggle (Todas/Pendentes/Aprovadas/Rejeitadas)
  saem — vira um único `FilterDropdown` com as 3 opções de status.

## 3. O que entra no projeto

Importar `FilterDropdown` de `base-ds` (`import { FilterDropdown } from 'base-ds'`) —
nada a implementar, a prop shape já é exatamente a planejada
(`label`, `options: { value, label }[]`, `value: string[]`, `onApply(next)`, mais
`align`/`disabled`/`className` opcionais que o componente do pacote já oferece).

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
