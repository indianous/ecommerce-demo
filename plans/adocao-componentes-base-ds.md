# Adoção de componentes `base-ds` — substituição de elementos nativos

## Contexto

Levantamento pontual (não motivado por bug) pedido para conferir se havia
componentes do `base-ds` sendo ignorados no projeto sem justificativa. Achados
registrados em duas issues no `base-ds`:

- `indianous/base-ds#11` — falta de `Textarea` (gap real, sem solução hoje;
  fora do escopo deste plano, os usos de `<textarea>` nativo permanecem como
  estão até a lib entregar o componente).
- `indianous/base-ds#12` — falta de variante icon-only no `Button` (gap real,
  sem solução hoje; os `<button>` icon-only listados abaixo permanecem nativos
  até a lib entregar a variante).

Este plano cobre apenas os casos em que o `base-ds` **já** tem o componente
equivalente e o projeto não está usando — ou está usando uma versão
desatualizada do que a lib oferece.

## 1. Problemas encontrados

- `app/(public)/page.tsx:19-31` — comentário afirma que `Button` do `base-ds`
  "only renders a `<button>` (no `href`/asChild support)" e por isso o link
  "Ver catálogo" foi implementado com um `<Link>` do Next estilizado
  manualmente, duplicando os tokens do `Button` (`bg-primary`,
  `text-primary-foreground` etc). **O comentário está desatualizado**: o
  `Button` já suporta `as="a"` + `href` desde o commit `3e48bda` ("Button como
  link e nova variante brutalist") no repositório `base-ds`, disponível na
  dependência local (`file:../../../node/base-ds`, `node_modules/base-ds`
  symlink resolvido em `~/dev/node/base-ds`). O workaround pode ser removido.

- `app/(employee)/dashboard/products/ProductsContent.tsx:144,152,163` —
  `<input type="search">` e dois `<select>` nativos (categoria, disponibilidade)
  sem nenhuma justificativa/comentário. O arquivo nem importa `Input`/`Select`
  do `base-ds`. Ambos os componentes cobrem o caso (`Input` aceita
  `type="search"`; `Select` aceita `options: SelectOption[]`).

- `app/(employee)/dashboard/orders/OrdersContent.tsx:78` — `<select>` nativo
  para "Filtrar por status", mesmo o arquivo já importando `Input` do
  `base-ds` (usado na busca, linha 71) — inconsistência clara.

- `app/(employee)/dashboard/orders/[id]/OrderDetailContent.tsx:281` —
  `<select id="retro-status">` nativo para "Estado destino" do retrocesso de
  status.

- `app/(employee)/dashboard/stock/StockContent.tsx:82` — `<input
  type="number">` nativo com `aria-label` por linha da tabela
  (`` `Quantidade ${p.name}` ``). **Atenção**: usar `Input` do `base-ds`
  (aceita `type="number"` + qualquer atributo HTML, incluindo `aria-label`),
  **não** `NumberInput` — este último exige `id` fixo, não repassa
  `aria-label`/atributos arbitrários e renderiza botões `+`/`−`, o que quebra
  o layout compacto da tabela e o teste
  `getByRole('spinbutton', { name: /quantidade .../i })`.

- `app/(employee)/dashboard/employees/page.tsx:119-128` e
  `app/(admin)/dashboard/admin/employees/page.tsx:125-134` — `<input
  type="checkbox">` envolto em `<label htmlFor>` nativo para cada permissão no
  Dialog. `base-ds` exporta `Checkbox` (prop `label`, mesma associação
  `htmlFor` internamente) cobrindo o caso.

- `components/forms/ContactForm.tsx:43,53`,
  `components/forms/CategoryForm.tsx:20`,
  `components/forms/BannerForm.tsx:35`,
  `components/forms/SocialLinksForm.tsx:33,44,55`,
  `components/forms/SiteMetadataForm.tsx:29` — `<input>` nativo
  (`type="text"/"tel"/"email"/"url"`) dentro de `FormField`, sem necessidade:
  `FormField` já clona o filho injetando `id`/`aria-describedby`/`aria-invalid`
  (`node_modules/base-ds` → fonte em `~/dev/node/base-ds/src/components/atoms/FormField/FormField.tsx`),
  e `Input` aceita os mesmos atributos HTML nativos. **Nenhum desses 5
  componentes está importado em nenhuma página hoje** (`grep` em `app/` não
  encontrou uso de `ContactForm`, `CategoryForm`, `BannerForm`,
  `SocialLinksForm` ou `SiteMetadataForm`) — parecem ter sido criados
  antecipando páginas de outros planos (`navegacao-site.md`, etc.) ainda não
  implementadas. Risco de regressão zero; ajuste é preparação para quando
  forem conectados.

- **Decisão de design a preservar** (não é bug, é um cuidado a tomar durante a
  migração): em `ProductsContent.tsx` (categoria, disponibilidade) e
  `OrdersContent.tsx` (status), a opção "Todos"/"Todas as categorias" hoje é
  um `<option value="">` **selecionável e não desabilitado** — funciona como
  reset de filtro. A prop `placeholder` do `Select` do `base-ds` renderiza a
  opção como `disabled`, o que impediria voltar a selecioná-la depois de
  escolher outro valor. Para esses três filtros, a opção "Todos" deve entrar
  como um item normal dentro de `options` (não via `placeholder`). Já em
  `OrderDetailContent.tsx` (retrocesso de status), "Selecione..." é de fato um
  placeholder obrigatório sem valor de retorno — ali a prop `placeholder` do
  `Select` é apropriada.

## 2. Testes a incluir/alterar

Comportamento existente não muda (refactor de implementação, não de UX) — os
testes abaixo devem continuar passando sem alteração de asserts, exceto onde
indicado. Rodar a suíte completa (`npm test` no `frontend/`) após cada arquivo
migrado.

- `app/(public)/__tests__/page.test.tsx` — já cobre
  `getByRole('link', { name: /ver catálogo/i })` com `href="/catalog"`; `Button
  as="a" href="/catalog"` continua renderizando `<a href>`, então **nenhuma
  alteração de teste é necessária**, só confirmar que continua verde.

- `app/(employee)/__tests__/employee.pedidos.page.test.tsx:121` — já cobre
  `getByRole('combobox', { name: /status/i })` selecionando `'CONFIRMED'`;
  `Select` do `base-ds` mantém `role="combobox"` e repassa `aria-label` — sem
  alteração de teste, só confirmar que continua verde.

- `app/(employee)/__tests__/employee.pedido.detalhe.page.test.tsx:188-190` —
  já cobre `getByRole('combobox', { name: /estado destino/i })` com
  `selectOptions(..., 'SHIPPED')` — sem alteração de teste, só confirmar que
  continua verde.

- `app/(employee)/__tests__/stock.page.test.tsx:91,99` — já cobre
  `getByRole('spinbutton', { name: /quantidade teclado mecânico/i })` — sem
  alteração de teste, só confirmar que continua verde (reforça por que a
  migração deve usar `Input`, não `NumberInput`).

- `app/(employee)/__tests__/employee.funcionarios.page.test.tsx:159-174` e
  `app/(admin)/dashboard/admin/__tests__/employee.permissions.page.test.tsx:78-97`
  — já cobrem `within(dialog).getByLabelText(/gerenciamento de pedidos/i)` etc;
  `Checkbox` do `base-ds` mantém a associação `label`+`htmlFor` — sem
  alteração de teste, só confirmar que continuam verdes.

- `app/(employee)/__tests__/products.page.test.tsx` — **não existe cobertura
  hoje** para os filtros de busca/categoria/disponibilidade de
  `ProductsContent.tsx`. Adicionar, no mesmo arquivo:
  - filtro de categoria (`getByRole('combobox', { name: /filtrar por
    categoria/i })`) muda a lista exibida/chama a API com o `categoryId`
    esperado;
  - filtro de disponibilidade (`getByRole('combobox', { name: /filtrar por
    disponibilidade/i })`) idem para `status`;
  - selecionar "Todas as categorias"/"Todos" depois de já ter filtrado deve
    voltar a listar tudo (cobre a decisão de design da seção 1 — a opção reset
    continua selecionável).

- `components/forms/__tests__/` — não criar teste dedicado para `ContactForm`,
  `CategoryForm`, `BannerForm`, `SocialLinksForm`, `SiteMetadataForm`: seguem a
  convenção de formulário puro sem validação própria, e como nenhuma página
  ainda os renderiza, a cobertura caberá ao plano que os conectar (`via
  within(dialog).getByRole(...)` no teste de página daquele plano).

## 3. O que entra no projeto

Sem mudanças de tipos, backend ou BFF — é refactor isolado de componentes de
página/formulário do frontend.

**Páginas/telas**:
- `app/(public)/page.tsx` — trocar o `<Link>` estilizado manualmente por
  `<Button as="a" href="/catalog">Ver catálogo</Button>`; remover o comentário
  desatualizado e o import de `Link` se não for mais usado em outro lugar do
  arquivo.
- `app/(employee)/dashboard/products/ProductsContent.tsx` — importar `Input`,
  `Select` do `base-ds`; trocar o `<input type="search">` por `Input`; trocar
  os dois `<select>` por `Select` com `options` incluindo a opção "Todas"/
  "Todos" como item normal (ver seção 1).
- `app/(employee)/dashboard/orders/OrdersContent.tsx` — importar `Select`;
  trocar o `<select>` de status por `Select`, mesma regra da opção "Todos".
- `app/(employee)/dashboard/orders/[id]/OrderDetailContent.tsx` — importar
  `Select`; trocar o `<select id="retro-status">` por `Select` usando a prop
  `placeholder="Selecione..."`.
- `app/(employee)/dashboard/stock/StockContent.tsx` — importar `Input`;
  trocar o `<input type="number">` por `Input type="number"`, mantendo
  `aria-label`, `min` e `onChange`.
- `app/(employee)/dashboard/employees/page.tsx` e
  `app/(admin)/dashboard/admin/employees/page.tsx` — importar `Checkbox`;
  trocar o bloco `<label><input type="checkbox">...</label>` por `<Checkbox
  id={id} label={PERMISSION_LABELS[perm]} checked={...} onChange={...} />`.

**Componentes de formulário** (`components/forms/`, atualmente não conectados
a nenhuma página):
- `ContactForm.tsx` — trocar os dois `<input>` (`tel`, `email`) por `Input`.
- `CategoryForm.tsx` — trocar o `<input type="text">` por `Input`.
- `BannerForm.tsx` — trocar o `<input type="url">` por `Input`.
- `SocialLinksForm.tsx` — trocar os três `<input type="url">` por `Input`.
- `SiteMetadataForm.tsx` — trocar o `<input type="text">` (linha 29) por
  `Input`; manter o `<textarea>` (linha 39) nativo — gap real, aguarda
  `indianous/base-ds#11`.

**Fora de escopo** (gaps reais do `base-ds`, aguardando a lib):
- Todos os usos de `<textarea>` nativo (`ContactForm.tsx`,
  `MarkdownContentForm.tsx`, `SiteMetadataForm.tsx`, `ReviewForm.tsx`,
  `RejectPaymentForm.tsx`, `OrderDetailContent.tsx`) — `indianous/base-ds#11`.
- Todos os `<button>` icon-only nativos (`AdminShell.tsx`,
  `EmployeeShell.tsx`, `CartCardItem.tsx`, `app/(customer)/orders/page.tsx`,
  `DuelingPicklist.tsx`, `SidebarAvatar.tsx`) — `indianous/base-ds#12`.
