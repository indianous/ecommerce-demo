@AGENTS.md

# Frontend — E-commerce

Next.js App Router · TypeScript · Tailwind · `base-ds` (`@indianous/base-ds`, GitHub Packages)
Testes: Vitest · Testing Library · MSW

Roda em `:3000`. Fala com o backend (`:8080/api/v1`) só pelo BFF (`app/api/*`).

As convenções gerais (TDD, plano em 3 seções, verificação visual, commits) estão
no `CLAUDE.md` da raiz do projeto (`../.claude/CLAUDE.md`).

## Mapa de rotas

```
app/
├── (auth)/           login, register
├── (public)/         catalog, about-us, contact, privacy-policy,
│                     terms-and-conditions, refund-policy
├── (customer)/       cart, checkout, orders, profile
├── (employee)/       dashboard/ → orders, products, payments,
│                     customers, employees, shipping, stock,
│                     site (índice) + site/[section] (uma página por
│                     função: logo, favicon, banners, gateway…)
│                     + site/navigation, site/distribution-centers,
│                     change-requests, profile
├── (admin)/          dashboard/admin/ → (espelha employee)
│                     + audit-logs
└── api/              BFF routes → proxy para :8080/api/v1
```

## Componentes e estado

```
components/
├── content/      Conteúdo de cada página (a page.tsx só renderiza o Content)
│   ├── auth/         Login, Register
│   ├── store/        Cart, Checkout, CustomerOrders, CustomerProfile, Reviews
│   ├── shared/       NotFound
│   └── dashboard/    início do painel e perfis (fora dos grupos do menu)
│       ├── sales/    Vendas: pedidos, pagamentos, envios, solicitações
│       ├── catalog/  Catálogo: produtos, estoque, excluídos, moderação
│       ├── people/   Pessoas: clientes, funcionários, administradores
│       ├── site/     Site: gestão do site (seções), navegação, centros de distribuição
│       └── system/   Sistema: analytics, auditoria
│                 Content novo vai na pasta do grupo do menu em que a tela aparece
│                 (dashboard-nav-groups.ts); tela sem grupo fica na raiz de dashboard/.
│                 Categoria nova: atualizar __tests__/content-structure.test.ts.
├── forms/        Formulários puros controlados (sem estado, sem fetch)
│                 → ver skill /new-form
├── layout/       AppShell, Navbar, PageSkeleton (fallback do Suspense dos layouts),
│                 DashboardUserMenu (avatar no header dos painéis)
├── auth/         MfaSetupPanel, RecoveryCodesPanel (2FA, usados no login e no perfil)
├── profile/      SecuritySection (2FA nos três perfis)
├── admin/        Tabelas e guards da área admin
├── employee/     PermissionGuard, componentes do dashboard
├── catalog/      CatalogSearch, CatalogPagination
├── cart/         CartDrawer, CartItem
├── checkout/     CheckoutForm, CheckoutAuth
└── product/      ProductCard

stores/
├── auth.store.ts    Zustand — accessToken + user + role
└── cart.store.ts    Zustand — items do carrinho

contexts/
└── SiteSettingsContext.tsx  placeholderImageUrl, faviconUrl,
                             instagramUrl, tiktokUrl, facebookUrl,
                             contactPhone (WhatsApp da loja)
```

Os layouts dos route groups `(admin)`, `(employee)`, `(customer)` e `(auth)`
envolvem o `{children}` num `<Suspense fallback={<PageSkeleton />}>`. É esse
boundary que permite `useSearchParams` (ex.: `usePaginatedFetch`) nas páginas.
Página que lê a URL num grupo **sem** esse boundary funciona no `next dev`, mas
quebra o `next build` no prerender. Por isso, rodar `npm run build` antes de
fechar um plano que mexe em rotas.

---

## Convenções obrigatórias

### UI — `base-ds` é obrigatório

Sempre usar os componentes fornecidos pela biblioteca.
Só usar elemento HTML nativo quando genuinamente não houver equivalente no base-ds — avisar antes.

Se a aplicação precisar de uma alteração em um componente existente do `base-ds` ou de um componente novo, abrir uma issue no repositório `indianous/base-ds` (GitHub) descrevendo a necessidade — antes de implementar workaround local.

#### Design system (base-ds)

- A UI vem do `base-ds`, instalado do GitHub Packages pelo **nome com escopo**
  (`"@indianous/base-ds": "^<versão>"`, imports `from '@indianous/base-ds'`, `.npmrc` apontando
  `@indianous` para `https://npm.pkg.github.com`). Nada de alias `npm:` (o Dependabot não o resolve,
  frontend#24) nem de `file:../base-ds` (symlink: causa duas instâncias de React). O teste
  `__tests__/base-ds-dependency.test.ts` barra os dois. `npm install` precisa de
  `GITHUB_PACKAGES_TOKEN` no ambiente (`export GITHUB_PACKAGES_TOKEN=$(gh auth token)`).
- Antes de criar um componente de UI, conferir o que o base-ds exporta em
  `node_modules/@indianous/base-ds/dist/index.d.ts` e seguir as regras de
  `node_modules/@indianous/base-ds/README.md`.
- Estilizar só com os utilitários dos tokens do base-ds, sem valores literais.
- Faltou algo ou achou bug no base-ds: abrir issue em indianous/base-ds em vez de contornar no app.
- O Dependabot do frontend abre, toda semana, o PR de versão nova do `@indianous/base-ds`. Ao começar
  uma tarefa de UI, rodar `npm outdated @indianous/base-ds` mesmo assim; se estiver atrás, ler
  https://github.com/indianous/base-ds/blob/main/CHANGELOG.md e atualizar conforme o README
  do base-ds.

### Layout de página — `Container` e landmark `<main>`

O **shell é o dono do `<main>`**: `AppShell`, `AdminShell` e `EmployeeShell`, e
o layout de `(auth)`, que não tem shell. Páginas e contents **nunca** renderizam
`<main>`. O teste `__tests__/no-nested-main.test.ts` barra isso. A largura e o
espaçamento vêm do `Container` do base-ds (`<div>`, sempre `mx-auto px-4`):

- **Contents do dashboard** (`components/content/dashboard/**`): sempre `<Container>` **sem
  `width`**, ou seja, 5xl pelo padrão do base-ds, em todas as telas (listagens,
  detalhes, formulários, perfis, gestão do site).
- **Contents da loja e de auth** (`store/`, `auth/`): mantêm largura própria. Login e cadastro
  `width="sm" spacing="loose"`, checkout `md`/`xl`, perfil do cliente `2xl`,
  pedidos e carrinho `4xl`, avaliações `3xl`.
- **Páginas públicas** (`app/(public)/**`): catálogo `width="7xl"`; páginas de
  texto (políticas, sobre, contato) `width="3xl" spacing="relaxed"`.

Estados de loading e vazio não mudam a largura. `role`/`aria-label` vão direto no `Container`.

### BFF

Toda chamada do frontend vai para `app/api/*` (Next.js route handler) que faz proxy para `localhost:8080/api/v1/*`.
O frontend **nunca** chama o backend diretamente.

### Formulários

Componentes em `components/forms/` são puros (sem `useState`, sem `fetch`).
O pai (página ou Dialog) detém estado + handler de save.
Testados via `within(dialog).getByRole(...)` no teste de página, **a não ser** que tenham validação própria — nesse caso ganham `__tests__/XxxForm.test.tsx`.

## Planos

Planos de implementação do frontend ficam em `plans/<nome>.md`.
