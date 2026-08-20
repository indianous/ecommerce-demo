# Dashboard agregado de analytics: funil e conversão por canal (frontend)

## Contexto

Par do plano de backend [[26-analytics-dashboard]]. Com a permissão
`MANAGE_ANALYTICS` (decisão confirmada no plano de backend, substitui a
ideia inicial de "só ADMIN"), esta tela segue o mesmo padrão de toda
seção do dashboard controlada por permissão granular: existe em **dois**
lugares —

- `(employee)/dashboard/analytics` — acessível a quem tem
  `MANAGE_ANALYTICS`;
- `(admin)/dashboard/admin/analytics` — mesmo conteúdo, `ADMIN` sempre
  acessa.

Mesmo padrão que `CustomerDetailContent.tsx` já estabelece: um componente
de conteúdo único, importado pelas duas páginas (`page.tsx` de cada lado
só monta o componente com o `backPath`/contexto certo, se precisar).

Ao construir esta tela, invocar a skill `dataviz` **antes** de escrever
qualquer gráfico/cor/layout de dashboard — é a política do projeto pra
qualquer visualização de dado, e esta é a primeira tela do projeto que
precisa de gráfico de verdade (funil, barras de conversão por canal), não
só tabela/card.

## 1. Problemas encontrados

- Não existe nenhuma rota de analytics agregado nem em
  `(employee)/dashboard/` nem em `(admin)/dashboard/admin/`.
- `types/index.ts` (`EmployeePermission`, linhas ~1-13) não tem
  `'MANAGE_ANALYTICS'` no union type.
- `components/employee/EmployeeShell.tsx:9-21` (`ALL_NAV_ITEMS`) não tem
  item pra analytics.
- `components/admin/AdminShell.tsx:7-20` (`navItems`) não tem item pra
  analytics.
- Não existe nenhum componente de gráfico no projeto ainda (nem funil, nem
  barra, nem série temporal) — não há precedente de `dataviz` aplicado
  neste codebase pra seguir como referência direta; a skill supre isso.
- Não existe um seletor de intervalo de datas reaproveitável — os únicos
  campos de data hoje são pontuais (ex. filtros simples), não um "de/até"
  combinado.

## 2. Testes a incluir/alterar

- `types/__tests__/index.test.ts` (existente) — se houver teste de
  exaustividade do union `EmployeePermission`, incluir
  `'MANAGE_ANALYTICS'`.
- `components/employee/__tests__/EmployeeShell.test.tsx` (existente) —
  novo caso: usuário com `MANAGE_ANALYTICS` vê o item "Analytics" no menu;
  sem a permissão, não vê.
- `components/admin/__tests__/AdminShell.test.tsx` (existente) — novo
  caso: item "Analytics" sempre presente (ADMIN não precisa de permissão
  granular).
- `app/(employee)/__tests__/analytics.page.test.tsx` (novo) e
  `app/(admin)/__tests__/analytics.page.test.tsx` (novo, ou reaproveitando
  o mesmo componente testado uma vez e a página do admin só testada quanto
  à montagem, mesmo padrão que a dupla `CustomerDetailContent`/
  `CustomerDetailPage`/`AdminCustomerDetailPage` já usa):
  - renderiza as 5 etapas do funil com os números vindos de
    `GET /api/admin/analytics/funnel`;
  - renderiza a tabela/gráfico de conversão por canal com os campos de
    `GET /api/admin/analytics/channels` (canal, cadastros, compradores,
    taxa de conversão, receita, ticket médio);
  - trocar o intervalo de datas refaz as duas chamadas com os novos
    `from`/`to`;
  - canal "Direto/não identificado" aparece na lista como qualquer outro,
    sem tratamento especial de UI que o esconda;
  - guard de RBAC: `PermissionGuard` (mesmo componente que
    `CustomerDetailContent.tsx` já usa) bloqueia acesso de quem não tem
    `MANAGE_ANALYTICS` nem é `ADMIN` — mesmo padrão de teste que qualquer
    outra seção permission-gated do dashboard.

## 3. O que entra no projeto

### BFF — novo `app/api/admin/analytics/funnel/route.ts` e
`app/api/admin/analytics/channels/route.ts`

Proxy pros dois endpoints novos do backend, repassando `from`/`to` como
querystring e o `Authorization`, mesmo padrão do resto do BFF admin.

### Tipos — `types/index.ts`

```ts
// no union EmployeePermission:
| 'MANAGE_ANALYTICS'

export interface FunnelResponse {
  visitors: number
  productViews: number
  cartAdds: number
  checkoutsStarted: number
  purchasesCompleted: number
  visitorToProductViewRate: number
  productViewToCartAddRate: number
  cartAddToCheckoutRate: number
  checkoutToPurchaseRate: number
}

export interface ChannelConversionResponse {
  channel: string
  signups: number
  buyers: number
  conversionRate: number
  revenue: number
  averageOrderValue: number
}
```

### `components/employee/EmployeeShell.tsx`

- + `{ label: 'Analytics', href: '/dashboard/analytics', perms:
  ['MANAGE_ANALYTICS'] as EmployeePermission[] }` em `ALL_NAV_ITEMS`.

### `components/admin/AdminShell.tsx`

- + `{ label: 'Analytics', href: '/dashboard/admin/analytics' }` em
  `navItems` (sem gating — `AdminShell` só renderiza pra `ADMIN`, mesma
  lógica de todo o resto da lista).

### `AnalyticsContent.tsx` (novo, client component,
`app/(employee)/dashboard/analytics/AnalyticsContent.tsx` — mesmo padrão
de local que `CustomerDetailContent.tsx` já usa pra ser reimportado pelo
lado admin)

- Envolto em `PermissionGuard permissions={['MANAGE_ANALYTICS']}` (mesmo
  componente/padrão de `CustomerDetailContent.tsx`).
- Seletor de intervalo (dois `Input type="date"`, default últimos 30 dias
  — mesmo default do backend) que refaz as duas chamadas ao mudar.
- Funil: visualização das 5 etapas com contagem e taxa de conversão entre
  cada uma — forma exata (barras horizontais decrescentes, ou um funil
  propriamente dito) definida seguindo a skill `dataviz` na hora de
  implementar, não fixada aqui de antemão.
- Conversão por canal: tabela ou gráfico de barras (cadastros vs.
  compradores por canal) + colunas de receita e ticket médio — mesma
  ressalva, forma final decidida com a skill `dataviz`.

### Páginas

- `app/(employee)/dashboard/analytics/page.tsx` — monta
  `<AnalyticsContent />`.
- `app/(admin)/dashboard/admin/analytics/page.tsx` — importa e monta o
  mesmo `AnalyticsContent` de `(employee)/dashboard/analytics/`, igual ao
  padrão já usado por `AdminCustomerDetailPage`.

### Fora de escopo

- Não constrói exportação nem comparação período-a-período (ver plano de
  backend).
