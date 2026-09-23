# 55 — Padrão único de margem/largura nos componentes de content

## Contexto

Os componentes em `components/content/` seguem, na prática, a receita
`<main className="mx-auto max-w-{N} px-4 py-8">` — a largura (`max-w-*`) varia
com o tipo de tela e o espaçamento é sempre o mesmo. Só que essa receita é
copiada à mão em ~40 lugares, não existe em nenhum componente, e colide com os
shells:

- `AdminShell` / `EmployeeShell` já envolvem tudo em `<main className="flex-1 p-6">`.
- `AppShell` (público + cliente) envolve tudo em `<main className="flex-1">`.

Decisão deste plano: **o shell é dono do landmark `<main>`; a página/content é
dona só da largura e do espaçamento**, via `Container` do base-ds (criado a
pedido na [indianous/base-ds#39](https://github.com/indianous/base-ds/issues/39),
disponível desde a v0.2.1). Os shells de dashboard perdem o `p-6` para não
somar com o padding do `Container`.

API do `Container` (`node_modules/base-ds/dist/index.d.ts`):

| Prop | Valores | Padrão |
|------|---------|--------|
| `as` | `div` \| `main` \| `section` \| `article` | `div` (sem landmark) |
| `width` | `sm` … `5xl`, `7xl` → `max-w-*` | `5xl` |
| `spacing` | `default` (`py-8`) \| `relaxed` (`py-12`) \| `loose` (`py-16`) | `default` |
| `className` | extras; sobrescreve os padrões via tailwind-merge | — |

Sempre aplica `mx-auto w-full px-4` e repassa os demais atributos HTML (`role`,
`aria-label`). `<Container>` sem props = `mx-auto max-w-5xl px-4 py-8`.

Não há componente local (`PageContainer` ou similar): o README do base-ds
proíbe wrapper no app para algo que o design system já oferece.

Independe do plano #56 (migração para o GitHub Packages): o `Container` já está
no `node_modules/base-ds` atual (link para o repositório local, v0.4.0). Se o
#56 for feito antes, nada muda aqui.

## 1. Problemas encontrados

| # | Arquivo | Linha | Diagnóstico |
|---|---------|-------|-------------|
| 1 | `components/admin/AdminShell.tsx` | 96 | `<main className="flex-1 p-6">` + `px-4 py-8` do content → padding dobrado no dashboard admin (~40px horizontal, ~56px vertical). |
| 2 | `components/employee/EmployeeShell.tsx` | 104 | Idem no dashboard employee. |
| 3 | `components/content/AdminsContent.tsx` | 124 | Sem wrapper: não tem `mx-auto`/`max-w-*`/padding — ocupa a largura toda, destoa das outras telas do dashboard. |
| 4 | `components/content/AuditLogsContent.tsx` | 101 | Idem (`<div>` sem classe). |
| 5 | `components/content/EmployeesContent.tsx` | 162 | Idem (`<>`). |
| 6 | `components/content/DashboardContent.tsx` | 79 | Idem (`<div>` sem classe). |
| 7 | `components/content/OrderDetailContent.tsx` | 231 | Mesmas classes, mas `<div>` em vez de `<main>` — única exceção de tag. |
| 8 | `components/content/NavigationContent.tsx` | 168 | Estado de loading usa `<main className="px-4 py-8">` sem `mx-auto max-w-3xl` → skeleton "pula" de largura quando o conteúdo carrega. |
| 9 | `components/content/DistributionCentersContent.tsx` | 126 | Idem (loading sem `mx-auto max-w-3xl`). |
| 10 | Todos os contents do dashboard + `site/SiteSectionPage.tsx:19` | — | `<main>` aninhado dentro do `<main>` do shell (HTML inválido; leitores de tela veem dois landmarks `main`). |
| 11 | `CartContent`, `CheckoutContent`, `CustomerOrdersContent`, `CustomerProfileContent`, `ReviewsContent` | — | Idem, dentro do `<main>` do `AppShell`. |
| 12 | `app/(public)/{catalog,catalog/[slug],about-us,contact,privacy-policy,refund-policy,terms-and-conditions}/page.tsx`, `catalog/loading.tsx` | — | Idem, páginas públicas com `<main>` próprio dentro do `AppShell`. |
| 13 | `app/(employee)/error.tsx` | 16 | `<main>` renderizado dentro do `EmployeeShell` (o boundary fica abaixo do layout do grupo). |
| 14 | `app/(auth)/layout.tsx` | 4 | Layout sem shell nem `<main>` — hoje o landmark vem do `LoginContent`/`RegisterContent`. Ao tirar o `<main>` deles, o layout de auth precisa renderizar um. |
| 15 | `components/content/CartContent.tsx` | 41 | `NumberInput` de quantidade na tabela do carrinho sem `FormField` e sem label — leitor de tela anuncia só "caixa de edição". O CHANGELOG 0.4.0 do base-ds pede `aria-label` nesses casos (a partir da 0.4.0 o `NumberInput` repassa `aria-*` ao input). |

Fora do escopo: `NotFoundContent` (hero centralizado com `px-6 py-24`, é
intencional e já usa `<div>`) e `app/error.tsx` (boundary raiz, renderiza fora
de qualquer shell — o `<main>` ali está correto).

## 2. Testes a incluir/alterar

O `Container` em si já é testado no base-ds — aqui só se testa o uso.

### `components/admin/__tests__/AdminShell.test.tsx`
- o `<main>` do shell não tem mais classe de padding (`p-6`).
- com um `<Container>` como filho, `getAllByRole('main')` tem tamanho 1.

### `components/employee/__tests__/EmployeeShell.test.tsx`
- mesmas duas asserções do `AdminShell`.

### `components/layout/__tests__/AppShell.test.tsx`
- com um `<Container>` como filho, `getAllByRole('main')` tem tamanho 1.

### `app/(auth)/__tests__/layout.test.tsx` (novo)
- o layout renderiza exatamente um `<main>` envolvendo os filhos.

### `components/content/site/__tests__/SiteSectionContent.test.tsx`
- linha 26: `container.querySelector('main')` deixa de fazer sentido (o
  `SiteSectionPage` não renderiza mais `<main>`). Trocar por
  `expect(container).toBeEmptyDOMElement()`.

### Teste do carrinho (arquivo existente de `CartContent`)
- `getByRole('spinbutton', { name: 'Quantidade de <nome do produto>' })`
  encontra o input de quantidade de cada item.

### `__tests__/no-nested-main.test.ts` (novo — guarda estática)
- lê via `fs` todos os `.tsx` de `components/content/**` e de
  `app/(public|customer|employee|admin)/**` (exceto `__tests__`) e falha se
  algum contiver `<main`. Evita que a receita antiga volte por copy-paste.

### Testes existentes que devem continuar passando sem alteração
Os testes de content que buscam o loading por
`getByRole('status', { name: 'Carregando …' })` (Reviews, Checkout,
CustomerOrders, Navigation) continuam válidos porque o `Container` repassa
`role`/`aria-label`. Rodar a suíte inteira para confirmar que nenhum teste
dependia de `<main>` implicitamente (a busca por
`getByRole('main')`/`querySelector('main')` hoje só encontra o caso da linha 26
acima).

## 3. O que entra no projeto

### 3.1 Shells e layouts
- `AdminShell.tsx:96` e `EmployeeShell.tsx:104`: `<main className="flex-1">`
  (remove `p-6`).
- `AppShell.tsx:63`: sem mudança.
- `app/(auth)/layout.tsx`: `<main>{children}</main>`.
- `app/(employee)/error.tsx:16`: `<main>` → `<div>`.

### 3.2 Contents — trocar `<main className="mx-auto max-w-X px-4 py-8 …">` por `<Container width="X" …>`

`width="5xl"` é o padrão, então fica omitido.

| Container | Arquivos |
|-----------|----------|
| `<Container>` (5xl) | Products, Customers, Payments, Shipping, Site, Solicitacoes (227), EmployeeOrders |
| `width="4xl"` | Cart (64), CustomerOrders (65 loading, 127), Stock, StockMovementHistory, Analytics, EmployeeDetail, EmployeeFuncionarioDetail |
| `width="4xl" spacing="loose" className="text-center"` | CustomerOrders (75, vazio) |
| `width="3xl"` | Navigation (168 loading + 178), DistributionCenters (126 loading + 130), ExpiringLots, DeletedProducts, ProductReviewsModeration, Reviews (131 loading + 140), OrderDetail (231), Solicitacoes (115), `site/SiteSectionPage.tsx:19` |
| `width="3xl" spacing="loose" className="text-center"` | Cart (17, vazio) |
| `width="2xl"` | ProductCreate, ProductEdit, CustomerDetail, PaymentConfirm |
| `width="2xl" className="flex flex-col gap-10"` | CustomerProfile (106) |
| `width="xl"` | Checkout (38 loading, 47) |
| `width="md"` | Checkout (27) |
| `width="md" spacing="loose" className="text-center"` | CustomerProfile (99) |
| `width="lg" className="flex flex-col gap-8"` | AdminProfile, EmployeeProfile |
| `width="sm" spacing="loose" className="flex flex-col gap-6"` | Login, Register |

Os estados de loading mantêm `role="status"` e `aria-label` direto no
`Container`.

Os quatro sem wrapper ganham `<Container>` (5xl, dentro do `PermissionGuard`
quando houver): `AdminsContent`, `AuditLogsContent`, `EmployeesContent`,
`DashboardContent`. 5xl porque são listagens/tabelas, igual às demais
listagens do dashboard.

### 3.3 Carrinho
- `CartContent.tsx:41`: `aria-label={`Quantidade de ${item.name}`}` no
  `NumberInput` (`CartItem.name`, `types/index.ts:340`).

### 3.4 Páginas públicas
- `catalog/page.tsx:61` e `catalog/loading.tsx:5` → `width="7xl"`.
- `catalog/[slug]/page.tsx:98` → `<Container className="flex flex-col gap-10">` (5xl).
- `about-us`, `contact`, `privacy-policy`, `refund-policy`,
  `terms-and-conditions` → `width="3xl" spacing="relaxed"`.

### 3.5 Documentação
- `.claude/CLAUDE.md`: adicionar em "Convenções obrigatórias" a regra
  "shell é dono do `<main>`; página/content usa `Container` do base-ds com
  `width`", com a tabela de larguras por tipo de tela (listagem 5xl,
  detalhe 4xl/3xl, formulário 2xl/xl, auth sm). Incluir `Container` na lista
  de componentes obrigatórios do base-ds.

### Efeito visual esperado (para a verificação manual)
- **Público, cliente e auth:** nenhuma diferença visual (mesmas classes, só a
  tag muda).
- **Dashboard (admin e employee):** o respiro em volta do conteúdo cai de
  ~40px/56px para 16px horizontal / 32px vertical, igual ao da área do
  cliente. As telas Administradores, Auditoria, Funcionários e o Painel
  inicial passam a ficar centralizadas com `max-w-5xl`, como as outras
  listagens.
- Navegação e Centros de distribuição: o skeleton de loading deixa de mudar de
  largura quando os dados chegam.
