# 57 — Boundary de `Suspense` para `useSearchParams` (build de produção quebrado)

## Contexto

`npm run build` compila e passa no typecheck, mas falha no prerender de 24
páginas com:

```
useSearchParams() should be wrapped in a suspense boundary at page "/orders".
Error occurred prerendering page "/orders" … exiting the build.
```

Segundo a doc do Next 16 instalado
(`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`,
seção *Prerendering*), uma página estática que chama `useSearchParams` num
Client Component **precisa** de um `<Suspense>` acima dele. Sem o boundary, o
build falha. Com ele, o Next pré-renderiza tudo acima do boundary e renderiza
no cliente só a parte que lê a URL. Em `next dev` as rotas são renderizadas
sob demanda e o erro não aparece. Por isso o problema passou despercebido desde
24/08 (`6ef8544`, paginação real do dashboard). O CI criado no plano #56 vai
falhar na etapa de build até este plano entrar.

### Onde está o `useSearchParams`

| Origem | Usado por | Páginas afetadas |
|--------|-----------|------------------|
| `lib/usePaginatedFetch.ts:24` | Admins, AuditLogs, Solicitacoes (change-requests), Customers, Employees, EmployeeOrders (orders), Payments, Products, DeletedProducts, Shipping, Stock, ExpiringLots | 22 rotas: 10 listagens em `/dashboard/*` e 12 em `/dashboard/admin/*` (Auditoria e Administradores existem só no admin) |
| `components/content/CustomerOrdersContent.tsx:34` | Retorno do gateway (`?payment=`) + paginação | `/orders` |
| `components/content/LoginContent.tsx:11` | `?callbackUrl=` e `?sessionExpired=1` | `/login` |
| `components/product/ProductReviewsSection.tsx` | Paginação das avaliações | `/catalog/[slug]`: **não quebra**, porque a rota é dinâmica (sem `generateStaticParams`) e não é pré-renderizada |

### Opções avaliadas

1. **`<Suspense>` em cada `page.tsx` afetada.** São 24 arquivos, e cada página
   nova com paginação precisa lembrar de repetir. Descartada.
2. **`loading.tsx` por segmento.** O Next envolve a página num `<Suspense>`
   automaticamente, mas o `loading.tsx` também vira o *instant loading state*
   de toda navegação entre páginas do segmento. Isso muda a experiência de
   navegação do dashboard inteiro: o conteúdo antigo seria trocado pelo
   esqueleto a cada clique no menu. Descartada.
3. **`<Suspense>` em volta de `{children}` no layout de cada route group.**
   **Escolhida.** São 4 arquivos (admin, employee, customer, auth) e cobre
   toda página atual e futura desses grupos. Na navegação client-side, o Next
   usa transições, então o boundary não troca o conteúdo pelo fallback a cada
   clique. O fallback só aparece no HTML estático inicial das páginas que leem
   a URL. As que não leem continuam pré-renderizadas por inteiro, porque o
   bailout só acontece onde o hook é chamado.

`connection()` / `force-dynamic` também resolveriam, mas tirariam do
prerender o shell das páginas (sidebar, navbar) sem necessidade.

## 1. Problemas encontrados

| # | Arquivo | Linha | Diagnóstico |
|---|---------|-------|-------------|
| 1 | `app/(admin)/dashboard/admin/layout.tsx` | 4 | `<AdminShell>{children}</AdminShell>` sem `Suspense`: 12 rotas `/dashboard/admin/*` (via `usePaginatedFetch`) quebram o prerender. |
| 2 | `app/(employee)/layout.tsx` | 5 | Idem para as 10 rotas `/dashboard/*`. |
| 3 | `app/(customer)/layout.tsx` | 5 | Idem para `/orders` (`CustomerOrdersContent.tsx:34`). |
| 4 | `app/(auth)/layout.tsx` | 4 | Idem para `/login` (`LoginContent.tsx:11`). |
| 5 | `frontend/.github/workflows/ci.yml` | — | Etapa `Build` vai falhar em todo push até o item 1–4 entrar (o `next build` nunca rodou em CI antes do plano #56). |

Fora do escopo:
- `(public)`: nenhuma página pré-renderizada lê a URL hoje, e o
  `/catalog/[slug]` é dinâmico.
- Os `Content` continuam chamando `useSearchParams` como hoje. Nada muda neles.

## 2. Testes a incluir/alterar

O prerender só é verificado de verdade pelo `next build`, que roda no CI
(`frontend/.github/workflows/ci.yml`, etapa *Build*) e na verificação final
deste plano. Os testes unitários garantem que cada layout tem o boundary com
o fallback certo. Um filho que suspende simula o que acontece no prerender:

```tsx
function Suspends(): never {
  throw new Promise(() => {})
}
```

### `app/(admin)/dashboard/admin/__tests__/layout.test.tsx`
- enquanto a página suspende, mostra o esqueleto de carregamento
  (`getByRole('status', { name: /carregando/i })`) **dentro** do shell (a
  sidebar continua visível).

### `app/(employee)/__tests__/layout.test.tsx`
- mesma asserção do admin.

### `app/(customer)/__tests__/layout.test.tsx`
- enquanto a página suspende, mostra o esqueleto de carregamento e a Navbar
  pública continua visível.

### `app/(auth)/__tests__/layout.test.tsx`
- enquanto a página suspende, mostra o esqueleto de carregamento.

### `components/layout/__tests__/PageSkeleton.test.tsx` (novo)
- expõe `role="status"` com nome acessível `Carregando página`.
- não renderiza `<main>`. Quem renderiza o landmark é o shell, seguindo a
  decisão do plano #55.

### Testes existentes
Os testes atuais dos quatro layouts (renderizam o `children`, mostram ou
escondem sidebar, navbar e rodapé) continuam passando sem alteração: com filho
síncrono, o `Suspense` é transparente.

## 3. O que entra no projeto

### 3.1 Componente — `components/layout/PageSkeleton.tsx`
Fallback genérico, só com base-ds:

```tsx
<Container role="status" aria-label="Carregando página">
  <Skeleton variant="line" height={32} className="mb-6 w-1/3" />  {/* título */}
  <Skeleton variant="line" height={40} className="mb-2" />         {/* 3 linhas de conteúdo */}
  …
</Container>
```

Mesmo padrão visual dos estados de loading que os `Content` já têm (linhas de
`Skeleton` de 40px), para a transição fallback → loading do content → dados
não "pular".

### 3.2 Layouts
Envolver o `{children}` com `<Suspense fallback={<PageSkeleton />}>` em:
- `app/(admin)/dashboard/admin/layout.tsx`
- `app/(employee)/layout.tsx`
- `app/(customer)/layout.tsx`
- `app/(auth)/layout.tsx`

O `Suspense` fica **dentro** do shell, para que sidebar, navbar e drawer sejam
pré-renderizados e só a área de conteúdo mostre o fallback. Os layouts
continuam Server Components (`Suspense` vem de `react`).

### 3.3 Documentação
- `.claude/CLAUDE.md`, seção "Frontend — componentes e estado": registrar que
  os layouts dos route groups têm o `Suspense` que permite `useSearchParams`
  nas páginas, e que página nova num grupo sem esse boundary quebra o
  `next build`, não o `next dev`.

### 3.4 Verificação
- `npm run typecheck`, `npx vitest run` e **`npm run build`** limpos. O build é
  o critério de aceite: as 24 rotas saem da lista de erros de prerender.
- Relação com o plano #55: se o #55 entrar depois, o `app/(auth)/layout.tsx`
  fica `<main><Suspense …>{children}</Suspense></main>`. Os dois planos mexem
  na mesma linha, então quem vier depois ajusta.

### Efeito visual esperado (para a verificação manual)
Em `next dev`, nenhuma diferença. Em produção (`npm run build && npm start`),
no primeiro carregamento de `/login`, `/orders` e das listagens do dashboard,
o HTML inicial mostra o shell com o esqueleto na área de conteúdo, trocado
pelo conteúdo na hidratação. A navegação entre páginas continua como hoje.
