# 48 — Agrupar a navegação do dashboard (Sidebar por categorias)

## Contexto

O menu lateral do dashboard cresceu bastante ao longo desta sessão (14 itens
no `AdminShell`, até 12 no `EmployeeShell`) e virou uma lista única, sem
organização visual. Este plano agrupa esses itens em categorias — Vendas,
Catálogo, Pessoas, Sistema — pra facilitar a escaneabilidade do menu.

Decisões já confirmadas com o usuário:
- Entra nos dois shells (`AdminShell` e `EmployeeShell`), mantendo os dois
  menus consistentes entre si.
- Agrupamento: **Vendas** (Pedidos, Envios, Solicitações, Pagamentos) ·
  **Catálogo** (Produtos, Estoque, Excluídos) · **Pessoas** (Clientes,
  Funcionários, Administradores) · **Sistema** (Auditoria, Site, Analytics) ·
  **Ver site** fica fora de qualquer grupo (é link externo,
  `target="_blank"`, não faz parte da navegação interna do dashboard).
- O `Sidebar` do base-ds hoje só aceita uma lista plana (`items: SidebarItem[]`,
  sem campo de grupo, sem sub-componente de mais baixo nível pra compor por
  fora) — o usuário escolheu **abrir uma issue no base-ds** pedindo suporte a
  agrupamento em vez de reimplementar a navegação fora do design system. A
  renderização visual do agrupamento fica bloqueada até essa issue ser
  resolvida — este plano cobre a issue e deixa o lado consumidor (ecommerce)
  pronto pra implementar assim que a capacidade existir.

## Estado atual

- `AdminShell.tsx` (`components/admin/AdminShell.tsx:10-25`): 14 itens numa
  lista plana `navItems`, sempre visíveis (sem filtro de permissão pro
  admin). Renderizada **duas vezes**: uma pro `Sidebar` desktop
  (`:47-58`), outra num `<ul>` próprio pro `Drawer` mobile (`:88-104`) — dois
  caminhos de renderização independentes, ambos precisam do agrupamento.
- `EmployeeShell.tsx` (`components/employee/EmployeeShell.tsx:12-25`):
  `ALL_NAV_ITEMS` com 12 itens, cada um com `perms: EmployeePermission[]`.
  Filtro OR por permissão (`:33-38`, dentro de um `useMemo`) — mantém o item
  se `perms.length === 0` ou se o funcionário tem pelo menos uma das
  permissões listadas. Mesmo padrão de dupla renderização (desktop `:56-66`,
  drawer mobile `:98-110`). Confirmado direto no arquivo: os únicos itens do
  `AdminShell` que **não existem** no `EmployeeShell` são "Administradores" e
  "Auditoria" — "Excluídos" existe nos dois.
- `Sidebar` do base-ds (`node_modules/base-ds/dist/index.d.ts:817-832`,
  fonte em `/home/indianous/dev/node/base-ds/src/components/organisms/Sidebar/Sidebar.tsx`):
  `SidebarItem` não tem campo de grupo; o componente renderiza um único
  `<ul role="list">` com `items.map(...)` (linhas 56-119 da fonte), sem slot
  pra cabeçalho customizado entre itens. Em modo `collapsed` (`w-14`), o
  `label` de cada item vira um `<span className="sr-only">` (linhas 61-65) —
  convenção que um cabeçalho de grupo também deveria seguir.
- `node_modules/base-ds` é um **symlink** pra `/home/indianous/dev/node/base-ds`
  (resolve pro `dist/` já compilado) — uma mudança lá não precisa de
  `npm install` aqui, só precisa que o `dist/` de lá seja rebuildado.
- Precedente de extração de componente compartilhado nesta sessão:
  `components/layout/Management*.tsx` (plano #40) — peças pequenas, um
  propósito, teste próprio.

## 1. Problemas encontrados

- `Sidebar` do base-ds não suporta agrupamento — bloqueio real, sem
  workaround limpo por fora (o componente já é dono do `<nav>` inteiro,
  toggle de colapsar incluso). Resolve-se abrindo issue, não contornando.
- `AdminShell.tsx` e `EmployeeShell.tsx` já duplicam a lista de navegação
  inteira numa segunda renderização pro drawer mobile — hoje isso é só JSX
  quase idêntico entre os dois arquivos; ao entrar o agrupamento, essa
  duplicação viraria **lógica de agrupamento duplicada em 2 lugares por
  shell** (4 cópias no total: desktop×2 shells + mobile×2 shells) se não for
  extraída antes.
- `EmployeeShell`'s items já passam por filtro de permissão — um grupo cujos
  itens foram todos filtrados pra um funcionário específico não pode deixar
  um cabeçalho de grupo vazio pra trás.

## 2. Testes a incluir/alterar (agrupados por arquivo)

- **`components/admin/__tests__/AdminShell.test.tsx`** (novo `describe`
  "Grupos de navegação"): cabeçalhos "Vendas"/"Catálogo"/"Pessoas"/"Sistema"
  aparecem na sidebar desktop; ordem no DOM respeita grupo → itens do grupo
  (ex.: "Vendas" antes de "Pedidos"/"Envios"/"Solicitações"/"Pagamentos",
  antes de "Catálogo"); "Ver site" renderiza fora de qualquer grupo;
  destaque do item ativo (`aria-current="page"`) continua funcionando com o
  item dentro de um grupo (estender o teste já existente pra cobrir um item
  de "Vendas" e um de "Pessoas"); modo colapsado esconde o texto do
  cabeçalho de grupo (`sr-only`), mesma convenção já testada pro label do
  item; drawer mobile mostra a mesma estrutura de grupos que o desktop.
- **`components/employee/__tests__/EmployeeShell.test.tsx`** (novo
  `describe` "Grupos de navegação"): com todas as permissões, os 4
  cabeçalhos aparecem na ordem certa; **grupo vazio some** — com só
  `MANAGE_ORDERS` concedida (só um item de "Vendas"), os cabeçalhos
  "Pessoas"/"Sistema"/"Catálogo" não aparecem (`queryByText` retorna nulo),
  só "Vendas"; com só `MANAGE_CUSTOMERS`+`MANAGE_EMPLOYEES` (ambos de
  "Pessoas"), só o cabeçalho "Pessoas" aparece; "Ver site" continua
  aparecendo sem nenhuma permissão concedida, sem cabeçalho de grupo; drawer
  mobile replica o mesmo comportamento de esconder grupo vazio; modo
  colapsado esconde texto do cabeçalho de grupo.
- **Novo `components/layout/__tests__/DashboardMobileNavList.test.tsx`**
  (se a extração do componente compartilhado for feita, ver seção 3): a
  função pura `groupNavItems()` testada isoladamente (grupos vazios, itens
  sem grupo intercalados, grupo de um item só); teste de render leve pro
  DOM de cabeçalho+links.
- Os testes de acessibilidade (`jest-axe`) já existentes em ambos os
  arquivos devem ser re-rodados após a implementação pra garantir que os
  novos cabeçalhos de grupo não introduzem violação (ex.: nível de heading
  semântico incorreto, se for esse o elemento escolhido).

## 3. O que entra no projeto

### Fase 1 — issue no base-ds (sem mudança de código no ecommerce ainda)
Abrir issue em `indianous/base-ds` (mesmo padrão das issues #32/#33 já
abertas nesta sessão: `## Necessidade`, `## Caso de uso bloqueado`,
`## Sugestão`, `## Workaround local hoje`), propondo um campo opcional
`group?: string` em `SidebarItem` (não uma prop `groups` paralela) — o
cabeçalho de grupo é inserido antes de cada sequência **contígua** de itens
com o mesmo `group`; itens sem `group` continuam renderizando sem cabeçalho,
em qualquer posição. Essa semântica resolve sozinho o caso de grupo vazio no
`EmployeeShell`: um grupo só existe visualmente se houver pelo menos um item
com aquele `group` no array recebido — nenhuma lista de grupos declarada à
parte, nenhum cálculo adicional do lado do app. Em modo `collapsed`, o texto
do cabeçalho vira `sr-only`, mesma convenção do `label` do item.

### Fase 2 — depois que o base-ds implementar e publicar a capacidade
- **Novo `components/layout/dashboard-nav-groups.ts`**: constantes
  `DASHBOARD_NAV_GROUPS` (Vendas/Catálogo/Pessoas/Sistema) — evita strings
  literais duplicadas/divergentes entre os dois shells.
- **Novo `components/layout/DashboardMobileNavList.tsx`** (+ teste): extrai
  o `<nav><ul>` do drawer mobile, hoje quase idêntico entre `AdminShell.tsx:88-104`
  e `EmployeeShell.tsx:98-110`, pra um componente único usado pelos dois —
  dedup que vale por si só, independente do agrupamento. Recebe os itens já
  filtrados por permissão, `pathname`, e o callback de fechar o drawer;
  aplica internamente a mesma lógica de "cabeçalho antes de cada sequência
  contígua do mesmo grupo" pedida na issue, via uma função pura exportada
  `groupNavItems()` (testável isolada dos componentes).
- **`AdminShell.tsx`**: reordena `navItems` (`:10-25`) pra que os itens do
  mesmo grupo fiquem adjacentes (ex.: "Pagamentos" sobe pra perto de
  "Pedidos"/"Envios"/"Solicitações"; "Administradores" desce pra perto de
  "Clientes"/"Funcionários") e anota cada um com `group: DASHBOARD_NAV_GROUPS.X`
  (campo ausente em "Ver site"); passa `group: item.group` no map pro
  `Sidebar` desktop (`:47-58`); troca o bloco do drawer mobile por
  `<DashboardMobileNavList items={navItems} pathname={pathname} onNavigate={closeDrawer} />`.
- **`EmployeeShell.tsx`**: mesma reordenação/anotação em `ALL_NAV_ITEMS`
  (`:12-25`), mantendo o `useMemo` de filtro por permissão (`:33-38`)
  **sem nenhuma mudança** — o `group` só "pega carona" nos itens que já
  sobrevivem ao filtro; mesma troca do map desktop (`:56-66`) e do bloco
  mobile pelo `DashboardMobileNavList`.
- Confirmar, antes de considerar a fase 2 concluída, que a implementação do
  base-ds realmente deriva a presença do cabeçalho dos itens recebidos (não
  de uma lista de grupos declarada à parte) — é o que garante o
  esconder-grupo-vazio automático no `EmployeeShell` sem lógica adicional.
