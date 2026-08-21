# 28 — Adoção dos componentes novos/atualizados do base-ds

## Contexto

O `base-ds` (`/home/indianous/dev/node/base-ds`, consumido via `file:` link) fechou hoje
(2026-08-21) 8 issues abertas pelo projeto `ecommerce` ao longo do desenvolvimento
(#10 a #18, exceto #9 que já havia sido resolvida em sessão anterior). Cada issue tinha
um workaround local documentado no próprio corpo da issue. Este plano troca cada
workaround pelo componente oficial correspondente.

Mapeamento issue → commit no base-ds → workaround local:

| Issue | Componente/fix | Commit base-ds | Workaround atual |
|---|---|---|---|
| #11 | `Textarea` | `050baf7` | `<textarea>` nativo em 5 forms + `OrderDetailContent` |
| #12 | `Button` `iconOnly` | `9536395` | `<button>` nativo em `AdminShell`/`EmployeeShell`/`OrdersContent`; `components/ui/IconButton.tsx` reimplementa variant/size manualmente |
| #13 | `Tabs` | `8ddd7cd` | tablist manual em `CheckoutAuth.tsx` |
| #14 | `MultiSelect` | `14fd9a1` | lista de `Checkbox` em `ProductForm.tsx` |
| #15 | `Tooltip` | `db7a2fa` | `components/ui/Tooltip.tsx` local |
| #16 | `ImageGallery` | `99522f4` | `Carousel` genérico em `ProductImageGallery.tsx` |
| #10 | `Button` `as="a" href` | `3e48bda` | `<Link>` do Next com classes copiadas do `Button` primário |
| #18 | `BarChart`/`Funnel` | `68bf3eb` | SVG/HTML manual em `FunnelChart.tsx`/`ChannelChart.tsx` (skill `dataviz`) |
| #17 | fix `ToastProvider` (crypto.randomUUID) | `1eb6984` | nenhum — correção interna, nada a trocar no consumidor |

`base-ds` está linkado via symlink (`node_modules/base-ds -> ../../../../node/base-ds`)
e o `dist/` já está buildado com essas mudanças — não é necessário reinstalar.

---

## 1. Problemas encontrados

1. **`app/globals.css`** — o bloco `@theme inline` (linhas 24–93) re-declara manualmente
   os tokens do `base-ds` que o projeto já usa, mas nunca incluiu os tokens de chart
   (`--color-chart-1..4`, `--color-chart-sequential-250..700`), que existem em
   `base-ds/dist/styles/theme.css:183-197`. Sem essa re-declaração, as classes
   `bg-chart-1`/`bg-chart-sequential-*` usadas dentro de `BarChart`/`Funnel` (importados
   do `dist/`, coberto pelo `@source`) não geram utilitário no Tailwind v4 — as barras
   ficariam sem cor de fundo. Bloqueia a adoção de #18.

2. **`components/ui/Tooltip.tsx` + `components/ui/IconButton.tsx`** — reimplementam à mão
   exatamente o que `base-ds` passou a exportar (`Tooltip`, `Button` `iconOnly`). Issues
   #12 e #15.

3. **`components/admin/AdminShell.tsx:66-73`**, **`components/employee/EmployeeShell.tsx:75-82`**,
   **`app/(customer)/orders/OrdersContent.tsx:97-107`** — `<button>` nativo icon-only
   (hamburger mobile / expandir linha do pedido) em vez de `IconButton`. Issue #12.
   `components/admin/SidebarAvatar.tsx:23-30` também usa `<button>` nativo, mas o trigger
   combina avatar + nome (não é icon-only quando `collapsed=false`) — **fica como está**,
   `Button iconOnly` força dimensão quadrada e não serve para esse trigger composto.

4. **`components/forms/CheckoutAuth.tsx:48-75`** — tablist manual (`role="tablist"` +
   dois `<button role="tab" aria-selected>`) duplicando exatamente a semântica que
   `Tabs` do `base-ds` já cobre. Issue #13.

5. **`components/forms/ProductForm.tsx:160-172`** — lista de `Checkbox` (um por categoria)
   para seleção múltipla, com `Select` auxiliar para escolher a principal. Issue #14 pede
   troca do bloco de `Checkbox` por `MultiSelect`; o `Select` de categoria principal
   (linhas 174-186) não é afetado — `MultiSelect` não tem noção de item "principal",
   então essa parte continua como está.

6. **`components/product/ProductImageGallery.tsx`** — usa `Carousel` genérico (uma
   `Image` por slide) como galeria de produto, sem thumbnails clicáveis nem zoom. Issue
   #16 pede troca pelo novo `ImageGallery` (thumbnails + zoom já embutidos).

7. **Textarea nativo em 6 arquivos** (issue #11):
   - `components/forms/SiteMetadataForm.tsx:36`
   - `components/forms/MarkdownContentForm.tsx:23`
   - `components/forms/RejectPaymentForm.tsx:26`
   - `components/forms/ReviewForm.tsx:48`
   - `components/forms/ContactForm.tsx:36`
   - `app/(employee)/dashboard/orders/[id]/OrderDetailContent.tsx:375` e `:424`
     (justificativa de transição de status e de retro-status)

8. **`components/layout/NotFoundContent.tsx:15-27`** — link de navegação estilizado à
   mão para imitar o `Button` primário (comentário no próprio arquivo documenta o
   workaround). `Button` agora aceita `as="a" href="..."`. Issue #10.

9. **`components/cart/CartDrawer.tsx:46-59`** e **`app/(customer)/cart/CartContent.tsx:25-30,83-88`**
   têm o mesmo workaround de link estilizado (issue #10), mas são navegação dentro do
   fluxo de compra (drawer → `/cart`/`/checkout`, carrinho → `/catalog`/`/checkout`) via
   `next/link`. `base-ds` só implementou `href` (renderiza `<a>` puro) — não implementou
   `asChild`, que era a alternativa pedida na issue para compor com `next/link`. Trocar
   esses por `Button as="a"` perderia a navegação client-side do Next (prefetch, sem
   reload) bem no meio do funil de checkout. **Decisão: não trocar esses três pontos.**
   Aberta a issue [indianous/base-ds#19](https://github.com/indianous/base-ds/issues/19)
   pedindo `asChild`/render-prop para compor com `next/link`, referenciando esses call
   sites. Só `NotFoundContent` (página 404, fora do fluxo principal) é trocado por
   `Button as="a"`.

10. **`components/layout/UserMenu.tsx`** — envolvia o trigger do `DropdownMenu` (avatar do
    usuário) num `Tooltip`. `DropdownMenu` clona o elemento de `trigger` para injetar
    `onClick`/`aria-haspopup`/`aria-expanded` (`DropdownMenu.tsx:90-98`); o `Tooltip` do
    `base-ds` só aceita `{label, position, children, className}` e descarta qualquer prop
    extra recebida — diferente do workaround local antigo, que espalhava `...rest`. Sem
    isso, o clique no avatar parava de abrir o menu. Removido o `Tooltip` desse trigger
    (o `aria-label` já cobre leitor de tela); aberta a issue
    [indianous/base-ds#20](https://github.com/indianous/base-ds/issues/20) pedindo que
    `Tooltip` repasse props extras ao filho.

11. **`components/analytics/FunnelChart.tsx`** e **`components/analytics/ChannelChart.tsx`**
    — implementação local em SVG/HTML seguindo a skill `dataviz`, com paleta hex validada
    manualmente (`STAGE_COLORS`, `SIGNUPS_COLOR`/`BUYERS_COLOR`). Issue #18 entrega
    `Funnel` e `BarChart` no `base-ds`, com paleta própria (tokens `chart-sequential-*` e
    `chart-1..4`, já os mesmos validados internamente pela lib). `Funnel` não tem
    equivalente para a anotação "reflete só clientes cadastrados" por etapa nem para o
    toggle gráfico/tabela — o próprio `Funnel` já expõe valor, % da primeira etapa e %
    vs. etapa anterior direto na label (tabela `sr-only` sempre presente), então o toggle
    fica redundante e é removido; a anotação de "só clientes cadastrados" vira uma legenda
    fixa abaixo do gráfico em vez de ícone por etapa. Em `ChannelChart`, `BarChart`
    substitui só a parte visual de barras (2 séries); a tabela detalhada com
    conversão/receita/ticket médio abaixo (dado que `BarChart` não cobre) é mantida como
    está.

---

## 2. Testes a incluir/alterar

- **`components/ui/__tests__/IconButton.test.tsx`** — nenhuma mudança de asserção
  esperada (API pública idêntica: `icon`, `label`, `as="a"`, `disabled`, `isLoading`
  continuam produzindo `aria-label`, `role="tooltip"` no hover, `role="link"` etc.);
  roda como regressão do refactor interno.
- **`components/ui/__tests__/Tooltip.test.tsx`** — removido junto com `Tooltip.tsx`.
- **`components/admin/__tests__/AdminShell.test.tsx`** e
  **`components/employee/__tests__/EmployeeShell.test.tsx`** — mantém asserção existente
  (`getByRole('button', {name: /abrir menu/i})` com `toHaveClass('md:hidden')`); sem
  adicionar teste novo, só regressão.
- **`app/(customer)/__tests__/orders.page.test.tsx`** — mantém asserções existentes
  (`getByRole('button', {name: /expandir #1/i})`); regressão.
- **`components/forms/__tests__/CheckoutAuth.test.tsx`** — mantém todas as asserções
  existentes (`getByRole('tab', ...)`, `aria-selected`); regressão, já cobre troca para
  `Tabs`.
- **`components/forms/__tests__/ProductForm.test.tsx`** (bloco `ProductForm — categorias`,
  linhas 45-125) — reescrever as 4 interações que usam
  `getByRole('checkbox', {name})` para o padrão de combobox do `MultiSelect`
  (`getByRole('combobox')` + digitar/abrir + `getByRole('option', {name})`), mantendo as
  mesmas asserções de `onFormChange` (`{categoryIds: [...]}`). Os testes do `Select` de
  categoria principal (linhas 85-111) não mudam.
- **`components/product/__tests__/ProductImageGallery.test.tsx`** (novo arquivo — hoje não
  existe teste dedicado) — cobrir: renderiza thumbnails clicáveis, troca imagem principal
  ao clicar numa thumbnail, `imageUrls` vazio mantém o placeholder atual
  (`role="img"` com `aria-label={productName}`).
- **`app/(public)/catalog/[slug]/__tests__/page.test.tsx`** (ou onde a página de produto é
  testada) — regressão, sem mudança de asserção esperada (`ProductImageGallery` mantém a
  mesma prop pública `imageUrls`/`productName`).
- **`components/layout/__tests__/NotFoundContent.test.tsx`** (se existir) ou teste das
  páginas `not-found` — trocar asserção de `getByRole('link', {name: /voltar/i})` (já deve
  passar sem mudança, já que `Button as="a"` também expõe `role="link"`); adicionar
  checagem de `href="/"`.
- **`components/analytics/__tests__/FunnelChart.test.tsx`** — reescrever:
  - manter teste de "exibe as 5 etapas com seus valores" (ajustar para o formato de label
    do `Funnel`: `"{label} — {valor} ({pct}%)"`)
  - manter teste de taxa de conversão (agora embutida na mesma label, não mais em nó
    separado)
  - trocar teste de anotação "só clientes cadastrados" de `[data-stage]` por checagem da
    legenda fixa abaixo do gráfico
  - remover teste de toggle para tabela (não existe mais); a tabela `sr-only` do `Funnel`
    cobre acessibilidade
  - manter teste de "sem visitantes não quebra"
- **`components/analytics/__tests__/ChannelChart.test.tsx`** — ajustar:
  - legenda: `BarChart` já renderiza a própria legenda com `seriesNames`; manter teste,
    ajustando seletor se necessário
  - manter teste "cada canal aparece com cadastros e compradores"
  - manter teste "sem tratamento especial pro canal Direto" — adaptar seletor pro DOM do
    `BarChart` (`data-testid="bar-chart-body"`)
  - manter teste da tabela de receita/ticket médio (não muda, tabela local preservada)
  - manter teste "sem canais não quebra"
- **`components/forms/__tests__/SiteMetadataForm.test.tsx`**,
  **`MarkdownContentForm.test.tsx`**, **`RejectPaymentForm.test.tsx`**,
  **`ReviewForm.test.tsx`**, **`ContactForm.test.tsx`** — regressão (o `<textarea>` nativo
  já era acessado via `getByRole('textbox', ...)`/`getByLabelText`, que `Textarea` do
  `base-ds` também satisfaz por renderizar um `<textarea>` real).
- **`app/(employee)/dashboard/orders/__tests__/OrderDetailContent.test.tsx`** — regressão
  nos dois campos de justificativa.

---

## 3. O que entra no projeto

1. **Config** — `app/globals.css`: adicionar ao `@theme inline` os 4 tokens
   `--color-chart-1..4` e os 10 tokens `--color-chart-sequential-250..700`.

2. **`components/ui/IconButton.tsx`** — reimplementar por cima de `Button` (`iconOnly`)
   + `Tooltip`, ambos importados de `base-ds`, mantendo a mesma API pública
   (`icon`/`label`/`as`/`href`/`variant`/`size`/`isLoading`). Deletar
   `components/ui/Tooltip.tsx` e seu teste.

3. **Botões icon-only nativos → `IconButton`**:
   `components/admin/AdminShell.tsx`, `components/employee/EmployeeShell.tsx` (hamburger,
   `icon="Menu"`, `label="Abrir menu"`, preservando `className="md:hidden"`),
   `app/(customer)/orders/OrdersContent.tsx` (expandir linha, mantendo
   `icon={expanded ? 'ChevronDown' : 'ChevronRight'}`).

4. **`components/forms/CheckoutAuth.tsx`** — trocar tablist manual por `Tabs` do
   `base-ds`, com os dois `tabs` (`login`/`register`) fechando sobre o estado/handlers
   já existentes no componente.

5. **`components/forms/ProductForm.tsx`** — trocar o bloco de `Checkbox` por
   `MultiSelect` (`options`, `value=form.categoryIds`,
   `onChange={(next) => onFormChange({ categoryIds: next })}`); manter o `Select` de
   categoria principal como está.

6. **`components/product/ProductImageGallery.tsx`** — trocar `Carousel` por
   `ImageGallery`, mapeando `imageUrls` para `{src, alt}[]`.

7. **`components/layout/NotFoundContent.tsx`** — trocar `<Link>` estilizado à mão por
   `Button as="a" href="/"`, remover o comentário de workaround.

8. **`components/analytics/FunnelChart.tsx`** — trocar corpo visual por `Funnel`
   (`steps`), com legenda fixa abaixo listando as etapas pós-login; remover toggle
   gráfico/tabela e `STAGE_COLORS`.

9. **`components/analytics/ChannelChart.tsx`** — trocar barras manuais por `BarChart`
   (`data`, `seriesNames=['Cadastros','Compradores']`, `orientation="horizontal"`),
   mantendo a tabela detalhada abaixo; remover `SIGNUPS_COLOR`/`BUYERS_COLOR`.

10. **Textarea nativo → `Textarea` do `base-ds`** em `SiteMetadataForm.tsx`,
    `MarkdownContentForm.tsx`, `RejectPaymentForm.tsx`, `ReviewForm.tsx`,
    `ContactForm.tsx`, `OrderDetailContent.tsx` (2 ocorrências).

**Fora de escopo (documentado, não implementado):**
- `components/cart/CartDrawer.tsx` / `app/(customer)/cart/CartContent.tsx`: mantidos como
  estão (ver item 9 da seção 1) — [base-ds#19](https://github.com/indianous/base-ds/issues/19).
- `components/admin/SidebarAvatar.tsx`: mantido nativo (trigger composto, não icon-only).
- `components/layout/UserMenu.tsx`: `Tooltip` removido do trigger do `DropdownMenu` por
  incompatibilidade descoberta durante a implementação (ver item 10 da seção 1) —
  [base-ds#20](https://github.com/indianous/base-ds/issues/20).
