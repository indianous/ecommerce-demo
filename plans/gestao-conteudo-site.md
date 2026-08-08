# Gestão de conteúdo do site — corrigir tela de admin quebrada em `main`

## Contexto

`main` está com `app/(employee)/dashboard/site/SiteContent.tsx` quebrado:
importa 8 formulários que não existem no repositório, derrubando o build e
o teste `employee.site.page.test.tsx` inteiro (erro de módulo não encontrado,
não uma falha de asserção).

**Causa raiz** (investigação via `git log`/`git diff --stat` entre branches):
duas branches evoluíram em paralelo sem nunca se encontrarem.

- `191cb6e` ("refactor: mover cadastro de categorias da gestão do site para
  produtos", branch `move-categorias-para-produtos`, mergeada em `main` via
  PR #2) reescreveu `SiteContent.tsx` já assumindo que 8 formulários de
  `components/forms/` existiam — mas nunca partiu de/mergeou a branch que os
  criava. `191cb6e` **não é descendente** de `855f367`.
- `855f367` ("feat: gestão de conteúdo do site — páginas institucionais,
  banners e redes sociais", branch `feature/gestao-conteudo-site`, **nunca
  mergeada**) criou exatamente esses 8 formulários, 10 rotas de BFF e 5
  páginas públicas institucionais. A própria mensagem do commit documenta que
  ficou incompleta: *"Inclui os formulários... ainda sem uma tela de admin
  que os conecte... segue para revisão/ajustes, incluindo a tela de admin que
  falta."*

O backend já está 100% pronto — `SiteSettingsController`, `BannerController`,
`SiteSettingsResponse` (já expõe `faviconUrl`/`instagramUrl`/`tiktokUrl`/
`facebookUrl`) foram mergeados em `main` via outra PR (aprovação manual de
pagamentos). **Falta só o lado frontend.**

Verifiquei prop a prop: as interfaces `Props` dos 8 formulários em
`feature/gestao-conteudo-site` batem **exatamente** com as props que
`SiteContent.tsx` (já em `main`) passa para cada um — forte indício de que
são os componentes certos, só nunca chegaram a `main`.

## 1. Problemas encontrados

- `app/(employee)/dashboard/site/SiteContent.tsx:7-14` — importa
  `PlaceholderImageForm`, `FaviconForm`, `LogoForm`, `SiteMetadataForm`,
  `BannerForm`, `MarkdownContentForm`, `ContactForm`, `SocialLinksForm` de
  `@/components/forms/*`, nenhum existe em `main`.
- `app/api/site/` — só existem `settings/route.ts` (GET) e
  `settings/placeholder-image/route.ts`. `SiteContent.tsx` chama mais 9 rotas
  que não existem: `settings/logo`, `settings/favicon`, `settings/metadata`,
  `settings/about-us`, `settings/contact`, `settings/social-links`,
  `settings/privacy-policy`, `settings/terms`, `settings/refund-policy`,
  `banners` (GET/POST), `banners/[id]` (DELETE).
- `app/(public)/` não tem `about-us/`, `contact/`, `privacy-policy/`,
  `refund-policy/`, `terms-and-conditions/` — páginas institucionais
  referenciadas no rodapé/menu não existem.
- `contexts/SiteSettingsContext.tsx:6-7` só expõe `placeholderImageUrl` —
  falta `faviconUrl`, `instagramUrl`, `tiktokUrl`, `facebookUrl` (já
  documentado como formato esperado no `CLAUDE.md` do projeto). Isso também
  é a causa de um erro de typecheck pré-existente em
  `components/product/__tests__/ProductCard.test.tsx:114` (`'faviconUrl' does
  not exist in type 'SiteSettingsContextValue'`).
- `components/layout/AppShell.tsx` não renderiza `socialLinks` no `Footer`
  (base-ds já suporta via `FooterSocialLink`, `index.d.ts:672-680`) e
  `components/layout/RootProviders.tsx` não monta nenhum componente de
  favicon dinâmico — `app/favicon.ico` estático continua sendo o único.
- `package.json` — `vitest`/`@vitest/coverage-v8` declarados em `^2.1.8` mas
  a versão realmente instalada/rodando é `4.1.10` (drift já existente,
  observado ao rodar a suíte); falta `react-markdown`, necessário para
  renderizar o conteúdo markdown das páginas institucionais.

## 2. Testes a incluir/alterar

**`app/(employee)/__tests__/employee.site.page.test.tsx`** (já existe em
`main`, 499 linhas, já escrito para a versão completa da tela — não deve
precisar de reescrita, só passa a compilar e rodar assim que os 8
formulários e as rotas de BFF existirem). Rodar e conferir 1:1 antes de dar
como concluído.

**`components/layout/__tests__/AppShell.test.tsx`** (existente em `main`) —
trazer os 3 casos novos de `feature/gestao-conteudo-site` (diff é puramente
aditivo, sem conflito com o que já existe):
- não exibe links de redes sociais quando todos os URLs são `null`;
- exibe os links configurados no `SiteSettingsContext`;
- exibe só os links cujo URL está configurado (filtra `null` individualmente).

**`app/(public)/__tests__/{about-us,contact,privacy-policy,refund-policy,terms}.page.test.tsx`**
(novos, vêm prontos de `feature/gestao-conteudo-site`) — SSR de cada página
institucional a partir de `GET /api/v1/site/settings` mockado.

Não há teste dedicado por formulário (`components/forms/__tests__/*Form.test.tsx`)
para os 8 novos — nenhum tem validação própria além de exigir arquivo/texto
preenchido, então a cobertura fica no nível de página
(`employee.site.page.test.tsx`, via `within(dialog)`), seguindo a convenção
do projeto.

**Regressão a conferir**: `types/__tests__/index.test.ts` e
`ProductCard.test.tsx` (erros de typecheck pré-existentes envolvendo
`faviconUrl`) devem parar de falhar depois do `SiteSettingsContext.tsx`
ganhar o campo.

## 3. O que entra no projeto

Estratégia: **merge de `feature/gestao-conteudo-site` em `main`**, resolvendo
o único conflito esperado (`SiteContent.tsx`, onde `main` já tem a versão
completa e correta — mantém a de `main`). Todo o resto do merge é aditivo
(arquivos novos) ou puramente aditivo em arquivo existente (`AppShell.tsx`,
`AppShell.test.tsx`, `SiteSettingsContext.tsx`, `RootProviders.tsx`,
`package.json`).

**Dependências** (`package.json`): adiciona `react-markdown`; atualiza
`vitest`/`@vitest/coverage-v8` para `^4.1.10` (reconcilia com o que já está
de fato instalado) e `next` para `^16.3.0`.

**Contexto**:
- `contexts/SiteSettingsContext.tsx`: adiciona `faviconUrl`, `instagramUrl`,
  `tiktokUrl`, `facebookUrl` ao value/provider, buscados do mesmo
  `GET /api/site/settings` que já existe.

**Componentes** (novos, `components/forms/`): `PlaceholderImageForm.tsx`,
`FaviconForm.tsx`, `LogoForm.tsx`, `SiteMetadataForm.tsx`, `BannerForm.tsx`,
`MarkdownContentForm.tsx`, `ContactForm.tsx`, `SocialLinksForm.tsx` — props
já verificadas 1:1 contra o uso em `SiteContent.tsx`, sem necessidade de
ajuste.

- `components/layout/DynamicFavicon.tsx` (novo): lê `faviconUrl` do
  contexto, atualiza `<link rel="icon">` via `useEffect`.
- `components/layout/AppShell.tsx`: adiciona ícones inline (Instagram,
  TikTok, Facebook) e monta `socialLinks` do `Footer` a partir do contexto,
  filtrando URLs nulos.
- `components/layout/RootProviders.tsx`: monta `<DynamicFavicon />` dentro do
  `SiteSettingsProvider`.
- Remove `app/favicon.ico` estático (substituído pelo dinâmico) — **decisão
  a confirmar com o usuário antes de aplicar**, já que é uma remoção.

**BFF** (novos, mesmo padrão de proxy 1:1 já usado no projeto — multipart
para upload de arquivo, JSON para os demais):
- `app/api/site/settings/logo/route.ts` (PUT, multipart)
- `app/api/site/settings/favicon/route.ts` (PUT, multipart)
- `app/api/site/settings/metadata/route.ts` (PUT, JSON)
- `app/api/site/settings/about-us/route.ts` (PUT, JSON)
- `app/api/site/settings/contact/route.ts` (PUT, JSON)
- `app/api/site/settings/social-links/route.ts` (PUT, JSON)
- `app/api/site/settings/privacy-policy/route.ts` (PUT, JSON)
- `app/api/site/settings/terms/route.ts` (PUT, JSON)
- `app/api/site/settings/refund-policy/route.ts` (PUT, JSON)
- `app/api/site/banners/route.ts` (GET público + POST multipart)
- `app/api/site/banners/[id]/route.ts` (DELETE)

**Páginas públicas** (novas, Server Component, SSR direto ao backend — mesmo
padrão de `catalog/page.tsx`): `app/(public)/about-us/page.tsx`,
`app/(public)/contact/page.tsx`, `app/(public)/privacy-policy/page.tsx`,
`app/(public)/refund-policy/page.tsx`,
`app/(public)/terms-and-conditions/page.tsx`.

**`app/(employee)/dashboard/site/SiteContent.tsx`**: **sem alteração** — a
versão já em `main` é a que fica; é ela quem dita o contrato de props que os
8 formulários novos precisam satisfazer (já conferido).

**Fora de escopo deste plano**: revisar se `feature/gestao-conteudo-site`
tem mais alguma coisa relevante além do listado acima (o commit também
mexeu em `app/favicon.ico` como arquivo binário removido — checar se algo
mais depende dele antes de remover).
