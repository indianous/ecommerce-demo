# Migração de `<a>` nativo para `<Link>` do Next.js (frontend)

## Contexto

Levantamento exaustivo (grep + leitura manual de cada ocorrência de
`<a` em `app/`, `components/`, `contexts/`, fora de testes) confirmou
um escopo pequeno: só **2 ocorrências** de `<a>` nativo apontam para
rota interna do próprio site, ambas no mesmo arquivo
(`app/(public)/catalog/page.tsx`). Também existem **2 ocorrências** de
`<Button as="a">` do `base-ds` apontando para rota interna — mas o
`Button` do `base-ds` sempre renderiza um `<a>` nativo internamente
quando `as="a"` (hardcoded, sem suporte a injetar `next/link`), então
essas duas ficam **bloqueadas** até o design system suportar isso (ver
seção 3).

Todo o restante de `<a>`/`Button as="a"` encontrado no projeto é uso
intencional e correto que **não deve virar `<Link>`**: protocolos
especiais (`tel:`, `mailto:`) e links para conteúdo hospedado
externamente com `target="_blank"` (anexos de solicitação, DANFE de
nota fiscal, checkout de gateway de pagamento) — `<Link>` do Next só
faz sentido para navegação client-side entre rotas do próprio app.

## 1. Problemas encontrados

- `app/(public)/catalog/page.tsx:56` — `<a href="/catalog">Todos</a>`,
  rota interna estática. Hoje causa reload de página inteira ao
  clicar, em vez da transição client-side do Next.
- `app/(public)/catalog/page.tsx:60-66` — `<a href={\`/catalog?categoryId=${cat.id}\`}>{cat.name}</a>`,
  um por categoria, mesma rota interna dinâmica, mesmo problema.
- `app/(public)/page.tsx:38` — `<Button as="a" href="/catalog">` —
  rota interna, mas via `Button` do `base-ds`.
  `/home/indianous/dev/node/base-ds/src/components/atoms/Button/Button.tsx:58-105`
  só sabe renderizar `<a>` puro quando `as="a"` (linha 79 monta
  `<a href={href} ...>` diretamente) — não existe mecanismo hoje para
  receber um componente de link customizado. Migração real bloqueada
  até o `base-ds` suportar isso.
- `app/(employee)/dashboard/site/SiteContent.tsx:594` —
  `<Button as="a" href={\`${basePath}/navigation\`}>Gerenciar navegação</Button>`
  — mesmo bloqueio do item anterior.
- Confirmado que **nenhuma outra ocorrência** de `<a>` nativo aponta
  para rota interna do site. Os demais usos encontrados são
  intencionalmente não-`Link`:
  - `app/(public)/contact/page.tsx:42` — `href={\`tel:${phone}\`}`.
  - `app/(public)/contact/page.tsx:50` — `href={\`mailto:${email}\`}`.
  - `app/(employee)/dashboard/change-requests/SolicitacoesContent.tsx:149`
    — `href={url}` (anexo de solicitação vindo do backend,
    `target="_blank" rel="noopener noreferrer"`), conteúdo hospedado
    externamente.
  - `app/(employee)/dashboard/orders/[id]/OrderDetailContent.tsx:297-306`
    (`Button as="a"`) — `href={order.invoice.danfeUrl}`
    (`target="_blank" rel="noreferrer"`), DANFE da nota fiscal,
    tipicamente domínio externo (SEFAZ/serviço de NF-e).
  - `components/forms/CheckoutForm.tsx:80` (`Button as="a"`) —
    `href={order.checkoutUrl}`, URL de checkout de gateway de
    pagamento externo (Stripe/PagSeguro/mock).

## 2. Testes a incluir/alterar

**`app/(public)/__tests__/catalog.page.test.tsx`** (estender — já
existe, usa o padrão `await CatalogPage({ searchParams }); render(jsx)`)

- Novo teste: com `fetchCategories` mockado retornando 1+ categoria
  (hoje o handler MSW de `/catalog/categories` retorna `[]` — trocar
  para incluir ao menos uma no `server.use(...)` desse teste), os
  links "Todos" e de cada categoria são encontrados via
  `screen.getByRole('link', { name: ... })`, com `href` correto
  (`/catalog` e `/catalog?categoryId=<id>` respectivamente).
  - **Atenção**: se `backend/plans/10-categorias-multiplas-produto.md`
    já tiver sido implementado antes deste plano, o filtro de
    categoria já não é mais `?categoryId=<uuid>` e sim
    `?category=<slug>` — ajustar o `href` esperado do teste conforme
    o estado real do código no momento da implementação, não conforme
    este documento.

- Observação técnica: `next/link` renderiza um `<a>` real no DOM, então
  `getByRole('link')` já encontra tanto a versão nativa atual quanto a
  migrada — o teste automatizado confirma texto/`href` corretos, não a
  ausência de reload de página em si. Vale conferir manualmente no
  navegador (clicar no filtro de categoria e observar que a página não
  recarrega por inteiro) antes de considerar a migração concluída.

Nenhum outro arquivo de teste precisa de ajuste — `app/(public)/page.tsx`
e `SiteContent.tsx` ficam de fora até o bloqueio do `base-ds` ser
resolvido (seção 3).

## 3. O que entra no projeto

### Componentes

- `app/(public)/catalog/page.tsx`: `import Link from 'next/link'`;
  troca as duas tags `<a>` (linhas 56 e 60-66) por `<Link>`, mantendo
  `href`/`className`/conteúdo idênticos — troca mecânica, sem mudança
  visual.

### Bloqueado pelo `base-ds` (não implementar agora)

- Abrir issue em `indianous/base-ds` pedindo que `Button` (quando
  `as="a"`) aceite renderizar através de um componente de link
  customizável (ex.: prop `linkComponent`, ou suporte a receber
  `next/link` quando `as` for um componente em vez da string `'a'`) —
  hoje `Button.tsx:79` sempre renderiza `<a>` nativo, então
  `app/(public)/page.tsx:38` e `SiteContent.tsx:594` continuam com
  reload de página inteira até essa mudança existir no design system.
  Quando o componente existir, atualizar essas duas ocorrências para
  usar o novo mecanismo.

Fora de escopo: os `<a>`/`Button as="a"` que apontam para conteúdo
externo (`tel:`, `mailto:`, anexos, DANFE, checkout de gateway de
pagamento) — esses devem continuar como estão; migrá-los para `<Link>`
seria incorreto, já que precisam da navegação de página inteira do
navegador para abrir/baixar recursos que não são rotas do próprio
Next.js.
