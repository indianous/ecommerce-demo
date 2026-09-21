# 52 — Páginas individuais para as funções de gestão do site

## Contexto

Hoje a gestão do site é **uma tela só** (`components/content/SiteContent.tsx`, 745 linhas):
um grid de 16 cards em `/dashboard/site` (e `/dashboard/admin/site`), onde 13 funções
abrem em **Dialog** sobre a mesma tela, uma (Melhor Envio) é um card embutido e duas
(navegação, centros de distribuição) já têm página própria. Quem gerencia o site
(permissão `MANAGE_SITE`, ou ADMIN) quer que **cada função tenha a sua própria página**,
acessada a partir da gestão do site.

Decisões e premissas deste plano (confirmar se alguma estiver errada):

- **"Gestor do site" = quem já tem `MANAGE_SITE`** (funcionário) **ou é ADMIN**. Não há
  role nem permissão nova; toda página nova usa `PermissionGuard` com `MANAGE_SITE`, como
  a tela atual. O backend já exige `MANAGE_SITE` nos endpoints que conferi
  (`SiteSettingsController`, `MelhorEnvioOAuthController`); nada muda nele por isso.
- **Todas as páginas são acessadas pelo menu lateral** (sidebar no desktop, drawer no
  mobile): cada função vira um item do menu, todos sob **um único grupo "SITE"** — que
  substitui o item "Site" que hoje fica no grupo "Sistema". Só aparecem pra quem tem
  `MANAGE_SITE` (funcionário) ou é ADMIN. O `base-ds` `Sidebar` só suporta lista plana com
  rótulo de grupo (sem item aninhado/expansível), então é uma lista plana sob o
  cabeçalho SITE, **sem workaround local, sem mudança e sem issue nova no `base-ds`**.
  "Sistema" continua existindo, só com `Auditoria` (admin) e `Analytics`.
- **`/dashboard/site` continua existindo como "Visão geral"** (hub): primeiro item do
  menu do site, com cards, descrição e status de cada função. Deixa de editar coisas.
- **Sem permissão por função** (ex.: gateway de pagamento só pra ADMIN): fora do escopo.
- **Depois de salvar, o usuário fica na página** (toast de sucesso, formulário com o valor
  salvo); o retorno ao hub é pelo link "← Voltar". Hoje o Dialog fecha ao salvar.
- Os dois shells (funcionário e admin) seguem espelhados, como no resto do dashboard.

## 1. Problemas encontrados

- `components/content/SiteContent.tsx` concentra 13 formulários, 41 `useState` e 14
  handlers de salvar numa tela só. Carrega logo/favicon/textos/banners/gateway/dados
  fiscais de uma vez (`:86-140`) mesmo quando o usuário só quer mudar um telefone.
- As funções **não têm URL própria**: não dá pra linkar, favoritar ou abrir uma
  diretamente, e o "voltar" do navegador não leva a lugar nenhum dentro da gestão.
- `components/employee/EmployeeShell.tsx:59` e `components/admin/AdminShell.tsx:51`
  marcam o item ativo com `pathname === item.href`. Com o menu do site, "Visão geral"
  (`/dashboard/site`) e as páginas (`/dashboard/site/logo`…) têm prefixos em comum, e
  hoje "Site" nem fica ativo em `/dashboard/site/navigation`. O mesmo em
  `components/layout/DashboardMobileNavList.tsx:49` (`aria-current`). Não dá pra trocar
  por `startsWith` simples: `/dashboard/products` e `/dashboard/products/deleted` são
  itens separados da sidebar — precisa de "prefixo mais longo vence".
- **A sidebar não rola.** O `<ul>` do `Sidebar` (`base-ds`) não tem `overflow`, e o
  wrapper do shell é `sticky top-0 h-screen`. Hoje são ~14 itens + 4 cabeçalhos; com 17
  itens do site + 1 cabeçalho a mais passam de ~1.200 px e os últimos itens (inclusive
  "Ver site") ficam cortados em telas normais. O wrapper é nosso — dá pra resolver com
  `overflow-y-auto` sem tocar no `base-ds`. Mesma coisa no drawer mobile.
- **Grupos precisam ser contíguos**: `groupNavItems`/`buildRows` repetem o cabeçalho
  quando o mesmo grupo aparece separado. Hoje o admin tem `Auditoria, Site, Analytics`
  seguidos em "Sistema"; ao tirar "Site" dali pro grupo SITE, `Auditoria` e `Analytics`
  têm que ficar juntos, e os 17 itens do site também.
- `MelhorEnvioOAuthController.java:103`: o callback do OAuth redireciona pra
  `…/dashboard/admin/site?melhorEnvio=connected`. Quando o card virar página própria, o
  redirect precisa apontar pra ela. (O card não lê o parâmetro `melhorEnvio` hoje — o
  status vem do `fetch` — então é só o destino que muda.)
- **Problema anterior, não resolvido aqui**: esse redirect é sempre pro caminho **admin**;
  um funcionário com `MANAGE_SITE` que conecta o Melhor Envio cai em
  `/dashboard/admin/site…`, e o middleware o manda pra `/`. Vale um plano à parte
  (o backend não sabe qual shell o usuário estava usando).
- Testes atuais que precisam ser redistribuídos:
  `app/(employee)/__tests__/employee.site.page.test.tsx` (510 linhas, 44 testes) e
  `app/(employee)/dashboard/site/__tests__/SiteContent.test.tsx` (302 linhas: gateway,
  dados fiscais, card de navegação, favicon, banners).

## 2. Testes a incluir/alterar

TDD: escritos **antes** da implementação. **Limitação (`base-ds#38`)**: testes de
componente não rodam neste ambiente (React duplicado via `base-ds`); os de lógica pura e
de route handler rodam. Os de componente ficam escritos e são validados por `tsc` +
`eslint` + confirmação visual — sinalizar isso ao entregar.

**`lib/__tests__/site-sections.test.ts`** (novo — registro das seções, roda local)
- tem exatamente as 14 seções esperadas, slugs únicos e em kebab-case
- toda seção tem título, descrição, ícone e grupo
- `getSiteSection('logo')` devolve a seção; slug desconhecido → `undefined`
- `isConfigured` das seções derivadas de `SiteSettings` (logo, favicon, placeholder,
  metadados, sobre nós, contato, redes sociais, políticas, dados fiscais): `false` com
  `null`/vazio, `true` com valor

**Também em `lib/__tests__/site-sections.test.ts`** — `siteNavItems(basePath)`
(itens do menu, roda local)
- devolve "Visão geral" (`${basePath}`) + as 16 páginas (`${basePath}/<slug>`, incluindo
  `navigation` e `distribution-centers`), nessa ordem
- cada item tem `label`, `icon` e `group`; **ícones distintos entre si** (sidebar
  recolhida mostra só ícone) e nomes válidos do `Icon`
- com `basePath="/dashboard/admin/site"` todos os `href` usam o prefixo admin
- todos os itens têm o **mesmo grupo `SITE`** e são contíguos (um cabeçalho só)

**`components/layout/__tests__/dashboard-nav-active.test.ts`** (novo — roda local)
- `/dashboard/site/logo` ativa **só** "Logo" (não "Visão geral"); `/dashboard/site` ativa
  só "Visão geral"; `/dashboard/site/navigation` ativa "Navegação"
- `/dashboard/products/deleted` ativa **só** "Excluídos" (prefixo mais longo vence), e
  `/dashboard/products/123/edit` ativa "Produtos"
- item externo (`Ver site`, `href: '/'`) nunca fica ativo

**`components/employee/__tests__/EmployeeShell.test.tsx`** e
**`components/admin/__tests__/AdminShell.test.tsx`** (alterar)
- com `MANAGE_SITE` (e no admin, sempre): o menu lista "Visão geral" e as 16 páginas do
  site **todas sob um único cabeçalho "Site"**, cada uma com o `href` certo
  (`/dashboard/site/<slug>`; `/dashboard/admin/site/<slug>` no admin)
- não existe mais o item "Site" dentro de "Sistema"
- sem `MANAGE_SITE`: nenhum item nem cabeçalho do site aparece
- "Sistema" continua com `Analytics` (funcionário com `MANAGE_ANALYTICS`) e
  `Auditoria` + `Analytics` (admin), sob um único cabeçalho
- em `/dashboard/site/logo` o item "Logo" tem `aria-current="page"` e "Visão geral" não;
  o teste do item "Ver site" (externo) segue valendo
- o wrapper da sidebar e o drawer têm `overflow-y-auto` (menu longo não é cortado)

**`components/layout/__tests__/DashboardMobileNavList.test.tsx`** (alterar)
- o drawer lista os itens do site agrupados, e `aria-current` cai só na página atual

**`lib/__tests__/useSiteSettings.test.ts`** (novo)
- carrega de `/api/site/settings`, expõe `loading` → `settings`; resposta não-ok deixa
  `settings` nulo sem lançar; `reload()` refaz a chamada

**`components/content/site/__tests__/SiteSectionPage.test.tsx`** (novo)
- sem `MANAGE_SITE`: redireciona pra `/dashboard` e não renderiza o conteúdo
  (migra "SiteContent — acesso")
- mostra o heading da seção e o link "← Voltar" apontando pra `backPath`
- durante o carregamento mostra `Skeleton` (`role="status"`)

**`app/(employee)/dashboard/site/__tests__/SiteContent.test.tsx`** (reescrever — vira o hub)
- mostra o heading "Gestão do Site" e um card por seção (14 + navegação + centros de
  distribuição), agrupados, cada um com link `href="${basePath}/<slug>"`
- com `basePath="/dashboard/admin/site"` os links usam o prefixo admin
- status "Configurado"/"Não configurado" nas seções que dependem de `/api/site/settings`
- sem `MANAGE_SITE`: nenhuma seção aparece (migra o teste equivalente)
- mantém os testes do card "Navegação do site" (link pra `/dashboard/site/navigation`)

**Um arquivo por seção em `components/content/site/__tests__/`** — os testes hoje em
`employee.site.page.test.tsx` e `SiteContent.test.tsx` **migram** pra cá (mesmas
asserções: PUT/POST no endpoint certo, toast de sucesso, toast de erro, botão desabilitado
sem arquivo, mensagem real do backend no erro), agora sem abrir Dialog:

| Seção (slug) | Vem de | Casos |
|---|---|---|
| `logo` | "salvar logo" | PUT + toast; desabilitado sem arquivo; erro |
| `placeholder-image` | "salvar placeholder", "exibe URL atual…", "não exibe… null" | idem + preview atual/ausente |
| `favicon` | "salvar favicon" + `SiteContent.test` favicon | idem + erro 400 com mensagem do backend |
| `metadata` | "salvar metadados" | PUT + toast; erro |
| `banners` | "banners" + `SiteContent.test` banners | POST; desabilitado sem arquivo; erro; remover pede confirmação; cancelar não remove |
| `about-us` | "salvar sobre nós" | PUT + toast; erro |
| `contact` | "salvar contato" | PUT + toast; erro |
| `social-links` | "salvar redes sociais" | PUT + toast; erro |
| `privacy-policy` | "salvar política de privacidade" | PUT + toast; erro |
| `terms` | "salvar termos e condições" | PUT + toast; erro |
| `refund-policy` | "salvar política de reembolso" | PUT + toast; erro |
| `payment-gateway` | `SiteContent.test` gateway | busca ativo; troca e salva; 409 sem atualizar estado |
| `fiscal-company-data` | `SiteContent.test` fiscais | preenche e salva |
| `melhor-envio` | (novo) | renderiza `MelhorEnvioConnectionCard`; sem regressão nos testes do card |

Cada seção também ganha: **carrega o valor atual** e **mostra-o no formulário** (antes o
Dialog reaproveitava o estado da tela inteira).

**`app/(employee)/dashboard/site/[section]/__tests__/section.page.test.tsx`** e
**`app/(admin)/dashboard/admin/site/[section]/__tests__/section.page.test.tsx`** (novos)
- slug válido renderiza a seção certa; slug desconhecido chama `notFound()`
- `generateMetadata` devolve o título da seção
- admin repassa `basePath="/dashboard/admin/site"`

**`app/(employee)/__tests__/metadata.test.ts`** e o equivalente do admin (alterar):
o `generateMetadata` da rota dinâmica entra no lugar de uma linha por página.

**Backend — `MelhorEnvioOAuthControllerIT`** (alterar): o `Location` do redirect do
callback passa a ser `…/dashboard/admin/site/melhor-envio?melhorEnvio=connected`.
Conferir a asserção existente antes de editar.

## 3. O que entra no projeto

Ordem: tipos → backend → BFF → componentes → páginas.

### Tipos e registro

- `lib/site-sections.ts` (novo): `SiteSectionId` e o array `SITE_SECTIONS` — **fonte única**
  de slug, título, descrição, ícone, grupo e `isConfigured?(settings)` das 14 seções (mais
  as duas já existentes, navegação e centros, marcadas como "página própria" pra o hub
  listá-las). Alimenta o hub, as páginas e os títulos. Slugs, alinhados às rotas da API:
  `logo`, `placeholder-image`, `favicon`, `metadata`, `banners`, `about-us`, `contact`,
  `social-links`, `privacy-policy`, `terms`, `refund-policy`, `payment-gateway`,
  `fiscal-company-data`, `melhor-envio`.
- Agrupamento **no hub** (cards): **Identidade visual** (logo, placeholder, favicon,
  metadados, banners) · **Conteúdo institucional** (sobre nós, contato, redes sociais,
  privacidade, termos, reembolso) · **Loja** (navegação, centros de distribuição) ·
  **Pagamento e integrações** (gateway, dados fiscais, Melhor Envio). **No menu lateral**
  não há esses subgrupos: os itens seguem a mesma ordem, mas todos sob o grupo **SITE**.
  Ícones distintos por item.
- `siteNavItems(basePath)` (mesmo arquivo): monta os `DashboardNavItem[]` do menu a partir
  do registro — "Visão geral" + 16 páginas, com `href = basePath/<slug>` e
  `group: DASHBOARD_NAV_GROUPS.SITE`.
- `components/layout/dashboard-nav-groups.ts`: `DASHBOARD_NAV_GROUPS` ganha `SITE: 'Site'`
  (hoje só `VENDAS`, `CATALOGO`, `PESSOAS`, `SISTEMA`); `SISTEMA` continua pra
  `Auditoria`/`Analytics`.

### Backend

- `MelhorEnvioOAuthController`: redirect do callback pra
  `frontendUrl + "/dashboard/admin/site/melhor-envio?melhorEnvio=connected"`.

### BFF

Nenhuma rota nova — todas as chamadas já passam por `app/api/site/*` e
`app/api/admin/site/melhor-envio`.

### Componentes

- `components/layout/dashboard-nav-active.ts` (novo): `isNavItemActive(pathname, item,
  allItems)` por prefixo mais longo, ignorando itens externos. Usado por `EmployeeShell`,
  `AdminShell` e `DashboardMobileNavList` (substitui `pathname === item.href`).
- `components/employee/EmployeeShell.tsx`: o item único "Site" sai de `ALL_NAV_ITEMS` e
  entra `...siteNavItems('/dashboard/site')` com `perms: ['MANAGE_SITE']` (o filtro por
  permissão já existente cuida do resto). Ordem: Pessoas → **grupo SITE** → Sistema
  (`Analytics`) → "Ver site", pra cada grupo ficar contíguo.
- `components/admin/AdminShell.tsx`: idem com `...siteNavItems('/dashboard/admin/site')`;
  ordem Pessoas → grupo SITE → Sistema (`Auditoria`, `Analytics`) → "Ver site".
- **Menu longo**: `overflow-y-auto` no wrapper da sidebar
  (`hidden md:block sticky top-0 h-screen`) e no drawer mobile
  (`fixed inset-y-0 … flex flex-col`), nos dois shells. Sem mudança no `base-ds`.
- `lib/useSiteSettings.ts` (novo): hook que busca `/api/site/settings` e expõe
  `{ settings, loading, reload }`.
- `components/content/site/SiteSectionPage.tsx` (novo): casca comum das páginas —
  `PermissionGuard` (`MANAGE_SITE`), `<main>`, link "← Voltar" (mesmo padrão do
  `NavigationContent`), `Heading` e estado de carregamento.
- `components/content/site/` — **um componente por seção** (14): o formulário e o handler
  de salvar que hoje estão em `SiteContent.tsx`, movidos **sem mudar o comportamento**
  (mesmos endpoints, corpos, toasts e mensagens de erro do backend). Reusam os formulários
  puros de `components/forms/` e o `ConfirmDeleteDialog`/`useConfirmDelete` (banners).
  A seção `melhor-envio` só embute `MelhorEnvioConnectionCard`. Cada uma recebe `backPath`.
- `components/content/SiteContent.tsx`: **encolhe pra o hub** — heading, grupos, um `Card`
  por seção com título, descrição, status (quando houver) e `Button` "Gerenciar" (com texto,
  `as="a"`). Perde os Dialogs, os 41 estados e os handlers.

### Páginas

- `app/(employee)/dashboard/site/[section]/page.tsx` e
  `app/(admin)/dashboard/admin/site/[section]/page.tsx` (novos): resolvem o slug em
  `SITE_SECTIONS`, exportam `generateMetadata` (título da seção) e chamam `notFound()` pra
  slug desconhecido. Uma rota dinâmica por shell em vez de 28 `page.tsx` — as páginas
  `navigation` e `distribution-centers` continuam como estão (rotas estáticas têm
  precedência). **Antes de escrever**: `AGENTS.md` avisa que esta versão do Next tem
  mudanças incompatíveis — ler `node_modules/next/dist/docs/` sobre rotas dinâmicas
  (`params` assíncrono), `generateMetadata` e `notFound`.
- `middleware.ts`: **sem mudança** — o matcher `/dashboard/:path*` já cobre as rotas novas
  (funcionário e admin).
- `.claude/CLAUDE.md`: acrescentar `site/[section]` ao mapa de rotas.

### Fora do escopo

- Permissão por função e novo role "gestor do site".
- Menu lateral **expansível/aninhado** e qualquer **issue no `base-ds`** (decisão do
  usuário: sem issue nova). A lista fica plana sob o grupo SITE, com scroll.
- Corrigir o redirect do OAuth do Melhor Envio pra funcionário (ver seção 1).
- Editar as páginas `navigation` e `distribution-centers` (já são individuais).
- Guardar rascunho ao navegar sem salvar.

### Critério de pronto

- `SiteContent.tsx` sem `Dialog`, sem `openDialog` e sem handlers de salvar.
- Cada uma das 14 seções abre em `/dashboard/site/<slug>` e
  `/dashboard/admin/site/<slug>`; slug inexistente → 404; sem `MANAGE_SITE` → redireciona.
- **Todas as 14 páginas, mais `navigation` e `distribution-centers` e a "Visão geral",
  aparecem no menu lateral** (desktop e drawer mobile), **todas sob o grupo "SITE"** (e
  não mais "Sistema"), só com `MANAGE_SITE` ou ADMIN; o item da página atual fica ativo e
  só ele; `Excluídos` continua separado de `Produtos`; `Auditoria` e `Analytics` seguem
  sob um único "Sistema".
- Com o menu completo, nenhum item fica cortado em tela de ~900 px de altura (rola), e
  "Ver site" continua alcançável.
- Nenhum teste existente removido sem equivalente na tabela da seção 2.
- Testes de lógica pura passando; `npx tsc --noEmit` limpo; `eslint` sem problema novo;
  backend: `./mvnw test` verde.
- Verificação visual do usuário (hub e as 14 páginas, desktop e mobile, funcionário e
  admin, fluxo do Melhor Envio) antes de qualquer commit.
