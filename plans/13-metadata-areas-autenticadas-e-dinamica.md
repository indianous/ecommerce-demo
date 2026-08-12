# Metadata dinâmico + títulos nas áreas autenticadas (frontend)

## Contexto

Duas mudanças combinadas:

1. Toda página autenticada (`(auth)`, `(customer)`, `(employee)`, `(admin)`)
   passa a exportar pelo menos `metadata: { title }`. Hoje nenhuma das
   52 páginas dessas áreas define `metadata` — todas herdam o fallback
   estático do layout raiz (`"Loja"`), então a aba do navegador não
   diferencia Pedidos de Estoque de Clientes etc.
2. O metadata padrão do site (`app/layout.tsx`) deixa de ser fixo no
   código e passa a vir da gestão do site (`siteTitle` /
   `defaultDescription`, editável em `/dashboard/(admin|employee)/site`
   via `SiteMetadataForm.tsx` → `PUT /api/site/settings/metadata` →
   `PUT /api/v1/site/settings/metadata` no backend). **Backend e BFF já
   suportam isso integralmente** — `SiteSettingsResponse.siteTitle` /
   `.defaultDescription` já existem e já são editáveis; não há mudança
   de backend ou de rota BFF neste plano, só consumo no frontend.

Decisão confirmada com o usuário: título das páginas usa
`title.template` do Next.js — o layout raiz define
`{ template: '%s · {siteTitle}', default: siteTitle }` e cada página
só passa a string simples (ex.: `'Pedidos'`), o Next compõe
automaticamente para `"Pedidos · Loja"`. As 8 páginas públicas que já
têm `metadata` com `title` string **não precisam de nenhuma alteração**
— o template do pai passa a se aplicar a elas também (hoje o pai é uma
string simples, então elas aparecem sozinhas na aba; com o pai virando
`{ template, default }` elas ganham o sufixo automaticamente).

Precedente já existente no código para fetch direto ao backend em
Server Component (sem passar pelo BFF): `generateMetadata` de
`app/(public)/catalog/[slug]/page.tsx` já busca
`${API_INTERNAL_URL}/catalog/products/slug/${slug}` diretamente, com
`next: { revalidate: 60 }`. O layout raiz vai seguir o mesmo padrão
para `${API_INTERNAL_URL}/site/settings` — chamada servidor-a-servidor
dentro do próprio processo Next.js, não é o navegador pulando o BFF (a
regra "frontend nunca chama o backend diretamente" é sobre chamadas do
cliente/browser).

Quando `siteTitle` / `defaultDescription` estiverem `NULL` no banco
(caso hoje, seed `V20__extend_site_settings.sql` insere ambos como
`NULL`, e é o estado de qualquer instalação nova até o admin preencher
o formulário), o fallback usado é o valor fixo atual:
`"Loja"` / `"Loja online — catálogo, carrinho e pedidos."`.

## 1. Problemas encontrados

- `app/layout.tsx:16-19` — `export const metadata` estático:
  `title: "Loja"`, `description: "Loja online — catálogo, carrinho e
  pedidos."`. Não reflete `siteTitle`/`defaultDescription` já
  editáveis pelo admin/funcionário em `/dashboard/site`. Título é
  string simples, sem `template`, então páginas filhas não herdam
  sufixo.
- 52 páginas sem nenhum `export const metadata` (nem `title`), listadas
  na seção 3 — todas herdam o `"Loja"` fixo do layout raiz hoje. Todas
  são Server Components (nenhuma tem `"use client"` no arquivo de
  página), então nenhuma tem impedimento técnico para exportar
  `metadata`.
- `app/(admin)/dashboard/admin/page.tsx` — só faz `redirect()`, nunca
  renderiza; mesmo assim ganha `metadata.title` por completude (o
  redirect acontece antes de qualquer render, mas o Next resolve
  metadata da rota mesmo em páginas que redirecionam server-side no
  primeiro request).

## 2. Testes a incluir/alterar

Não existe hoje nenhum teste que importe `metadata`/`generateMetadata`
de página — os únicos testes que mencionam "metadata" cobrem o
formulário admin (`SiteMetadataForm`/`SiteContent`), não o `<title>` da
aba. Os testes abaixo são novos, todos `.test.ts` puros (sem
render/jsdom — só importam o módulo e checam o valor exportado).

- `app/__tests__/layout.metadata.test.ts` (novo)
  - mocka `global.fetch` (mesmo padrão dos testes de
    `app/api/*/route.test.ts`) para `${API}/site/settings`
  - `generateMetadata()` retorna
    `{ title: { template: '%s · Loja Teste', default: 'Loja Teste' }, description: 'Descrição de teste' }`
    quando o backend responde `siteTitle`/`defaultDescription`
    preenchidos
  - quando o backend responde `siteTitle: null` / `defaultDescription: null`
    (ou o `fetch` rejeita), cai no fallback
    `default: 'Loja'` / `description: 'Loja online — catálogo, carrinho e pedidos.'`

- `app/(auth)/__tests__/metadata.test.ts` (novo) — importa `metadata`
  de `login/page.tsx` e `register/page.tsx`, assert `title` de cada um

- `app/(customer)/__tests__/metadata.test.ts` (novo) — importa
  `metadata` de `cart`, `checkout`, `orders`, `profile`, `reviews`

- `app/(employee)/__tests__/metadata.test.ts` (novo) — importa
  `metadata` das 22 páginas de `(employee)/dashboard/**`

- `app/(admin)/__tests__/metadata.test.ts` (novo) — importa `metadata`
  das 23 páginas de `(admin)/dashboard/admin/**`

Cada um desses 4 testes é uma tabela simples
(`it.each([[modulo, tituloEsperado], ...])`) comparando
`metadata.title` com o valor definido na tabela da seção 3.

## 3. O que entra no projeto

Sem mudança de tipos, backend ou rotas BFF — tudo consumido já existe
(`GET /api/site/settings` → `SiteSettingsResponse.siteTitle` /
`.defaultDescription`).

### `app/layout.tsx`

Troca `export const metadata: Metadata = {...}` estático por:

```ts
import type { Metadata } from 'next'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

const FALLBACK_TITLE = 'Loja'
const FALLBACK_DESCRIPTION = 'Loja online — catálogo, carrinho e pedidos.'

export async function generateMetadata(): Promise<Metadata> {
  const siteTitle = await fetchSiteTitleAndDescription()
  return {
    title: { template: `%s · ${siteTitle.title}`, default: siteTitle.title },
    description: siteTitle.description,
  }
}

async function fetchSiteTitleAndDescription() {
  try {
    const res = await fetch(`${API}/site/settings`, { next: { revalidate: 60 } })
    if (!res.ok) return { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION }
    const data = await res.json()
    return {
      title: data.siteTitle || FALLBACK_TITLE,
      description: data.defaultDescription || FALLBACK_DESCRIPTION,
    }
  } catch {
    return { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION }
  }
}
```

`revalidate: 60` segue o mesmo precedente de
`catalog/[slug]/page.tsx` — uma mudança no admin leva até 60s para
refletir no `<title>`, aceitável para esse dado (troca raramente, e o
form de site já mostra toast de sucesso na hora, o usuário não precisa
do `<title>` atualizando instantaneamente).

`RootLayout` (o componente, não o `metadata`) não muda.

### Páginas autenticadas — `metadata: { title }` a adicionar

Título reaproveita o label já usado nas sidebars
(`AdminShell.tsx`/`EmployeeShell.tsx`) ou o texto do `<Heading>` da
própria página, para consistência entre aba do navegador e conteúdo.

**`(auth)`**

| Arquivo | title |
|---|---|
| `login/page.tsx` | `'Entrar'` |
| `register/page.tsx` | `'Cadastro'` |

**`(customer)`**

| Arquivo | title |
|---|---|
| `cart/page.tsx` | `'Carrinho'` |
| `checkout/page.tsx` | `'Finalizar pedido'` |
| `orders/page.tsx` | `'Meus pedidos'` |
| `profile/page.tsx` | `'Meus dados'` |
| `reviews/page.tsx` | `'Minhas avaliações'` |

**`(employee)/dashboard`** (mesmos títulos valem para o espelho em
`(admin)/dashboard/admin`, exceto onde marcado)

| Arquivo (employee) | Arquivo (admin) espelho | title |
|---|---|---|
| `page.tsx` | `page.tsx` | `'Painel'` |
| `change-requests/page.tsx` | `change-requests/page.tsx` | `'Solicitações'` |
| `customers/page.tsx` | `customers/page.tsx` | `'Clientes'` |
| `customers/[id]/page.tsx` | `customers/[id]/page.tsx` | `'Detalhes do cliente'` |
| `employees/page.tsx` | `employees/page.tsx` | `'Funcionários'` |
| `employees/[id]/page.tsx` | `employees/[id]/page.tsx` | `'Detalhes do funcionário'` |
| `orders/page.tsx` | `orders/page.tsx` | `'Pedidos'` |
| `orders/[id]/page.tsx` | `orders/[id]/page.tsx` | `'Detalhes do pedido'` |
| `payments/page.tsx` | `payments/page.tsx` | `'Pagamentos'` |
| `payments/[id]/confirm/page.tsx` | `payments/[id]/confirm/page.tsx` | `'Confirmar pagamento'` |
| `products/page.tsx` | `products/page.tsx` | `'Produtos'` |
| `products/new/page.tsx` | `products/new/page.tsx` | `'Novo produto'` |
| `products/[id]/edit/page.tsx` | `products/[id]/edit/page.tsx` | `'Editar produto'` |
| `products/[id]/reviews/page.tsx` | `products/[id]/reviews/page.tsx` | `'Avaliações do produto'` |
| `products/deleted/page.tsx` | `products/deleted/page.tsx` | `'Produtos excluídos'` |
| `profile/page.tsx` | `profile/page.tsx` | `'Meu perfil'` |
| `shipping/page.tsx` | `shipping/page.tsx` | `'Envios'` |
| `site/page.tsx` | `site/page.tsx` | `'Site'` |
| `site/navigation/page.tsx` | `site/navigation/page.tsx` | `'Navegação do site'` |
| `stock/page.tsx` | `stock/page.tsx` | `'Estoque'` |
| `stock/[id]/page.tsx` | `stock/[id]/page.tsx` | `'Detalhes do estoque'` |
| `stock/expiring/page.tsx` | `stock/expiring/page.tsx` | `'Estoque a vencer'` |

**`(admin)` — só neste grupo (sem espelho employee)**

| Arquivo | title |
|---|---|
| `audit-logs/page.tsx` | `'Auditoria'` |

Total: 1 layout raiz alterado + 52 páginas ganhando `export const
metadata = { title: '...' }` (linha nova no topo do arquivo, depois
dos imports — nenhuma outra linha muda).

### Fora de escopo (não entra neste plano)

- Título dinâmico por entidade nas páginas de detalhe (ex.:
  `"Pedido #1234"` em vez de `"Detalhes do pedido"`) — pediria
  `generateMetadata` assíncrono buscando a entidade em cada uma das 7
  páginas `[id]`, dado extra de complexidade para páginas que não são
  indexadas (autenticadas, sem SEO). Título estático atende o pedido
  do usuário ("pelo menos title"); vira sugestão de melhoria futura se
  o usuário quiser.
- `description` nas páginas autenticadas — usuário pediu só `title`.
