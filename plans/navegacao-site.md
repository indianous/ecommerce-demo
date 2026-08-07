# Links de navegação (navbar e footer) gerenciáveis pelo site (frontend)

## Contexto

Complementa `backend/plans/navegacao-site.md`. `base-ds` já suporta os dois
formatos pedidos nativamente: `Navbar` aceita `items: NavItem[]` (link
solto ou dropdown), `Footer` aceita `columns: FooterColumn[]` (título +
links) — só falta alimentar essas props com dado real, hoje nenhuma das
duas recebe nada (`AppShell.tsx:44-58`).

## 1. Problemas encontrados

- `components/layout/AppShell.tsx:44-58` — `<Navbar>` é montado sem
  `items`; `<Footer>` sem `columns`. É por isso que hoje não existe nenhum
  link de navegação no site além do logo/busca/carrinho/menu de usuário.
- `contexts/SiteSettingsContext.tsx:1-51` busca `/api/site/settings` uma
  vez no mount e expõe alguns campos (favicon, redes sociais); não busca
  nada de navegação — é o lugar natural pra estender, já que `AppShell`
  já consome esse contexto e já roda em todo layout (client-side, mesmo
  padrão dos social links que também populam `Footer`).
- Não existe nenhuma tela de admin para cadastrar coleção/link — nem
  rota, nem componente.
- `types/index.ts` não tem `NavItem`/`NavItemType`/`NavPlacement` (nome do
  tipo de dado do backend — não confundir com o `NavItem` já exportado
  pelo próprio `base-ds`, que é o formato *de saída* pro `Navbar`; usar um
  nome diferente no `types/index.ts`, ex. `SiteNavItem`, pra não colidir).

## 2. Testes a incluir/alterar

**`contexts/__tests__/SiteSettingsContext.test.tsx`** (estender, checar se
já existe — senão criar)

- `GET /api/site/nav-items` mockado com uma coleção (`placement: BOTH`) e
  um link direto (`placement: FOOTER`) → o contexto expõe `navbarItems`
  já no formato `NavItem[]` do `base-ds` (dropdown pra coleção, link solto
  pro que for `NAVBAR`/`BOTH`) e `footerColumns` no formato
  `FooterColumn[]` (uma coluna por coleção `FOOTER`/`BOTH`, mais uma
  coluna de 1 link por link direto `FOOTER`/`BOTH`).
- item com `placement: NAVBAR` não aparece em `footerColumns`; item
  `FOOTER` não aparece em `navbarItems`.
- falha no fetch → contexto expõe listas vazias, sem quebrar o
  `AppShell`.

**`components/layout/__tests__/AppShell.test.tsx`** (estender, arquivo já
existe)

- com `navbarItems`/`footerColumns` do contexto preenchidos, `Navbar`
  recebe `items` e `Footer` recebe `columns` correspondentes.

**`components/forms/__tests__/NavItemForm.test.tsx`** (novo — tem
validação própria: URL obrigatória pra link, coerência tipo/campos, ganha
teste dedicado)

- tipo "Link direto" exige label + URL + local de exibição;
  tipo "Coleção" exige só label + local de exibição (sem URL).
- URL sem `http(s)://` mostra erro de validação antes do submit.

**`app/(employee)/dashboard/site/navigation/__tests__/NavigationContent.test.tsx`**
(novo)

- lista itens de topo (coleções e links diretos) na ordem atual; botões
  "Nova coleção" e "Novo link" abrem `Dialog` com `NavItemForm`.
- dentro de uma coleção expandida, lista os links filhos com opção de
  adicionar/editar/remover.
- reordenar (subir/descer, já que drag-and-drop teste de e2e é frágil em
  teste unitário) chama o endpoint de reorder correspondente
  (topo vs. filhos de uma coleção).
- remover uma coleção com filhos mostra confirmação antes de excluir
  (cascade apaga os links dentro).
- sem `MANAGE_SITE`, a página inteira não renderiza (`PermissionGuard`).

**`app/api/site/nav-items/__tests__/route.test.ts`** e
**`app/api/admin/site/nav-items/__tests__/route.test.ts`** (novos, padrão
dos demais testes de rota BFF)

- rota pública repassa `GET` sem `Authorization`; rota admin repassa
  `GET`/`POST`/`PUT`/`DELETE`/`PATCH` com `Authorization` e o `status` do
  backend.

## 3. O que entra no projeto

### Tipos

`types/index.ts`:

- `export type SiteNavItemType = 'LINK' | 'COLLECTION'`
- `export type NavPlacement = 'NAVBAR' | 'FOOTER' | 'BOTH'`
- `export interface SiteNavItem { id: string; type: SiteNavItemType; label: string; url?: string; placement: NavPlacement; position: number; children?: SiteNavItem[] }`

### BFF

- `app/api/site/nav-items/route.ts` (novo) — `GET`, proxy público (sem
  `Authorization`) para `${API}/site/nav-items`, mesmo padrão de
  `app/api/site/settings/route.ts`.
- `app/api/admin/site/nav-items/route.ts` (novo) — `GET`/`POST`, proxy
  para `${API}/admin/site/nav-items`, repassando `Authorization`.
- `app/api/admin/site/nav-items/[id]/route.ts` (novo) — `PUT`/`DELETE`.
- `app/api/admin/site/nav-items/order/route.ts` e
  `app/api/admin/site/nav-items/[id]/children-order/route.ts` (novos) —
  `PATCH`.

### Componentes

- `contexts/SiteSettingsContext.tsx` — busca também `GET
  /api/site/nav-items` no mesmo `useEffect` (paralelo ao fetch de
  settings, via `Promise.all`); adiciona ao valor do contexto
  `navbarItems: NavbarNavItem[]` (tipo `NavItem` importado de `base-ds`) e
  `footerColumns: FooterColumn[]` (tipo importado de `base-ds`), montados
  a partir da árvore de `SiteNavItem[]` conforme a regra: item
  `placement` `NAVBAR`/`BOTH` vira entrada de `navbarItems` (`COLLECTION`
  → `{type:'dropdown', label, items: children.map(c => ({label:
  c.label, href: c.url}))}`; `LINK` → `{type:'link', label, href:
  url}`); item `FOOTER`/`BOTH` vira entrada de `footerColumns`
  (`COLLECTION` → `{title: label, links: children...}`; `LINK` direto →
  `{title: label, links: [{label, href: url}]}`, conforme decidido com o
  usuário).
- `components/layout/AppShell.tsx:44-58` — `<Navbar items={navbarItems}
  .../>` e `<Footer columns={footerColumns} .../>`, lidos do contexto
  estendido acima.
- `components/forms/NavItemForm.tsx` (novo, form puro controlado — tem
  validação própria, ganha teste dedicado) — `Select` de tipo (Link
  direto / Coleção), campos label/URL (URL escondido quando tipo =
  Coleção), `Select`/`RadioGroup` de local de exibição (Navbar / Footer /
  Ambos).

### Páginas

- `app/(employee)/dashboard/site/navigation/page.tsx` +
  `NavigationContent.tsx` (novos) — lista os itens de topo em ordem
  (`Card` por item), coleções expansíveis mostrando os filhos; botões
  "Nova coleção"/"Novo link" abrem `Dialog` com `NavItemForm`; cada
  item/filho tem editar, remover e subir/descer (reorder); protegida por
  `PermissionGuard(['MANAGE_SITE'])`.
- `app/(employee)/dashboard/site/SiteContent.tsx` — adiciona um link/card
  "Gerenciar navegação" apontando pra `/dashboard/site/navigation` (mesmo
  papel de link cruzado já usado em `ProductEditContent.tsx:76-78` para
  "Ver avaliações").
- Espelhar as duas páginas novas em
  `app/(admin)/dashboard/admin/site/` (mesmo padrão de espelhamento
  employee → admin já usado no restante do dashboard).
