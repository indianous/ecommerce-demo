# Fix: header/footer duplicado na página 404 (frontend)

## Contexto

Bug: acessar `/catalog/<slug-inexistente>` mostra o `Navbar` e o
`Footer` **duas vezes**, um dentro do outro.

Causa raiz, confirmada contra a documentação do Next.js deste projeto
(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`):
quando `notFound()` é chamado dentro de uma rota (aqui,
`app/(public)/catalog/[slug]/page.tsx:82`), o Next.js procura o
`not-found.tsx` mais próximo **subindo pela árvore de segmentos**
daquela rota. Não existe `not-found.tsx` em `catalog/[slug]/`,
`catalog/`, nem em `(public)/` — então cai no `app/not-found.tsx` da
raiz. Mas, como a doc confirma ("`not-found.js` renders between
`loading.js` and `page.js`" — ou seja, no lugar do `page.js`, dentro
da mesma árvore de layouts), esse fallback da raiz continua sendo
renderizado **dentro de `app/(public)/layout.tsx`**, que já envolve
tudo em `<AppShell>` (Navbar+Footer). E `app/not-found.tsx` **também**
envolve seu próprio conteúdo em `<AppShell>` (linha 9) — daí o
Navbar/Footer duplicado: um do `(public)/layout.tsx`, outro do
`app/not-found.tsx`.

Isso só acontece quando `notFound()` é chamado de dentro de uma rota
aninhada num layout que já tem seu próprio `AppShell`/shell — uma URL
totalmente inexistente (que não bate com nenhuma rota, tipo
`/asdasd`) não passa por nenhum layout de grupo, então nesse caso o
`AppShell` do `app/not-found.tsx` é necessário, não duplicado. O bug
é especificamente sobre `notFound()` chamado de dentro de `(public)`
(e, pelo mesmo motivo estrutural, aconteceria em `(customer)`
também, que tem o mesmo `<AppShell>` no `layout.tsx` — só que
nenhuma página de `(customer)` chama `notFound()` hoje, então o bug
ainda não foi disparado lá, mas a causa é idêntica).

Por que os testes existentes não pegaram isso: `catalog.product-detail
.page.test.tsx` mocka `notFound` só pra verificar que foi chamado
(`throw new Error('NEXT_NOT_FOUND')`), sem passar pelo mecanismo real
de resolução de `not-found.tsx` do Next.js — e `not-found.test.tsx`
renderiza `<NotFound />` isolado, sem aninhar dentro de
`(public)/layout.tsx`. Nenhum dos dois exercita a composição real que
causa a duplicação (ver seção 2).

## 1. Problemas encontrados

- `app/(public)/layout.tsx:5` — envolve `children` em `<AppShell>`,
  sem um `not-found.tsx` próprio no grupo pra interceptar antes do
  fallback da raiz.
- `app/not-found.tsx:9` — envolve o conteúdo em `<AppShell>`
  incondicionalmente; correto só quando é o fallback de uma URL sem
  rota nenhuma, duplicado quando renderizado dentro de um layout que
  já tem `AppShell`.
- `app/(customer)/layout.tsx:5` — mesmo padrão de `(public)/layout.tsx`
  (`<AppShell>{children}</AppShell>`, sem `not-found.tsx` próprio).
  Nenhuma página de `(customer)` chama `notFound()` hoje, então o bug
  ainda não se manifesta ali, mas a estrutura é idêntica.

## 2. Testes a incluir/alterar

- `app/(public)/__tests__/not-found.test.tsx` (novo) — reproduz a
  composição real: renderiza `app/(public)/not-found.tsx` **dentro**
  de `app/(public)/layout.tsx` (`render(<PublicLayout><PublicNotFound
  /></PublicLayout>)`), igual ao que o Next.js monta de verdade.
  - `screen.getByRole('navigation', { name: /main navigation/i })` —
    só 1 elemento (se houvesse dois, `getByRole` já falharia por
    ambiguidade — é a prova direta da regressão)
  - `screen.getByRole('contentinfo')` — só 1 footer
  - `screen.getByRole('heading', { level: 1, name: /página não
    encontrada/i })` presente
  - link "Voltar para o início" com `href="/"`

- `app/(customer)/__tests__/not-found.test.tsx` (novo) — mesmo teste,
  trocando `PublicLayout` por `CustomerLayout` — cobre o caso ainda
  não disparado mas com a mesma causa raiz.

- `app/__tests__/not-found.test.tsx` (existente) — sem alteração;
  continua validando o `app/not-found.tsx` da raiz isolado (esse
  continua precisando do próprio `AppShell` pro caso de URL sem rota
  nenhuma).

## 3. O que entra no projeto

Sem tipos novos, sem mudança de backend.

### Extrai o conteúdo — `components/layout/NotFoundContent.tsx` (novo)

Mesmo JSX que já existe em `app/not-found.tsx` hoje (heading + texto +
link "Voltar para o início"), só que sem o `<AppShell>` em volta —
cada consumidor decide se precisa envolver ou não.

```tsx
'use client'

import Link from 'next/link'
import { Heading, Text } from 'base-ds'

export function NotFoundContent() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Heading as="h1" size="4xl">
        Página não encontrada
      </Heading>
      <Text size="lg" color="muted" className="max-w-xl">
        A página que você procura não existe ou foi movida.
      </Text>
      <Link
        href="/"
        className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Voltar para o início
      </Link>
    </div>
  )
}
```

### `app/not-found.tsx` — passa a reaproveitar

```tsx
'use client'

import { AppShell } from '@/components/layout/AppShell'
import { NotFoundContent } from '@/components/layout/NotFoundContent'

export default function NotFound() {
  return (
    <AppShell>
      <NotFoundContent />
    </AppShell>
  )
}
```

Continua sendo o fallback pra URL sem rota nenhuma — precisa do
`AppShell` porque nesse caso não existe nenhum layout de grupo em
jogo.

### `app/(public)/not-found.tsx` (novo)

```tsx
import { NotFoundContent } from '@/components/layout/NotFoundContent'

export default function PublicNotFound() {
  return <NotFoundContent />
}
```

Sem `AppShell` — `(public)/layout.tsx` já fornece. Intercepta
`notFound()` chamado de qualquer página dentro de `(public)` (hoje só
`catalog/[slug]/page.tsx`, mas vale pra qualquer futura) antes de
cair no fallback da raiz.

### `app/(customer)/not-found.tsx` (novo)

Idêntico ao de `(public)`, mesma razão — `(customer)/layout.tsx`
também já fornece `AppShell`.

### Fora de escopo

- `(employee)`/`(admin)` não têm `AppShell` no layout (usam
  `EmployeeShell`/`AdminShell`), e nenhuma página desses grupos chama
  `notFound()` hoje — o mesmo bug de duplicação não se aplica a eles
  do jeito que está. Se algum dia uma página do dashboard passar a
  chamar `notFound()`, o fallback da raiz vai renderizar o `AppShell`
  **público** aninhado dentro do `EmployeeShell`/`AdminShell` — um
  problema diferente (mistura de shells, não duplicação), que exigiria
  decidir como deve ser o "não encontrado" dentro do dashboard. Não
  mexi nisso aqui por não ser o bug reportado e não ter nenhum
  gatilho hoje.
