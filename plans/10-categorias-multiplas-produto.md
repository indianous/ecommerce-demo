# Categorias múltiplas por produto + busca por slug (frontend)

## Contexto

Complementa `backend/plans/10-categorias-multiplas-produto.md`. O
backend passa a expor `List<CategoryResponse> categories` (ordenada,
posição 0 = categoria principal) em vez de `categoryId`/`categoryName`
singulares, e o catálogo público passa a filtrar por
`?category=<slug>` em vez de `?categoryId=<uuid>`. Sem compatibilidade
retroativa com links antigos (decisão do usuário). O filtro
administrativo continua por UUID — nenhuma mudança de comportamento
ali, só o `Product` type que muda (afeta a coluna da tabela).

## 1. Problemas encontrados

- `types/index.ts:112-117` (`Category`) já tem `slug` — sem mudança
  necessária aqui. `types/index.ts:134-135` (`Product`) tem
  `categoryId`/`categoryName` singulares — precisa virar
  `categories: Category[]`.
- `components/forms/ProductForm.tsx:107-116` — `<Select>` único de
  categoria (`ProductFormState.categoryId: string`). O `base-ds` **não
  tem** um componente de multi-select/combobox hoje — só existe
  `Select` (single) e `TagsInput` (texto livre, sem vínculo com uma
  lista fixa de opções, não serve para escolher categorias reais por
  id). Por convenção do projeto (`CLAUDE.md`), antes de implementar um
  workaround local é preciso abrir uma issue no repositório
  `indianous/base-ds` pedindo o componente adequado. Workaround local:
  lista de `Checkbox` (mesmo padrão já usado em
  `app/(employee)/dashboard/employees/page.tsx:114-127` para o dialog
  de permissões).
- `app/(public)/catalog/page.tsx:13-15,39,43,62,85-86` — filtro usa
  `?categoryId=<uuid>` (função `fetchProducts`, `searchParams`, links
  de categoria, prop repassada a `CatalogPagination`).
- `components/catalog/CatalogSearch.tsx:8,16` — recebe/propaga
  `categoryId` como prop. **Não é usado em lugar nenhum do projeto
  hoje** (componente órfão, confirmado por grep) — ainda assim, será
  ajustado junto por ser mecânico e mesmo tema.
- `components/catalog/CatalogPagination.tsx:9,20` — mesma coisa,
  `categoryId` como prop usada na querystring da paginação.
- `app/(public)/catalog/[slug]/page.tsx:98,124` — breadcrumb
  (`href: /catalog?categoryId=${product.categoryId}`) e badge
  (`{product.categoryName}`) usam os campos singulares.
- `components/product/ProductCard.tsx:61-64` — badge com
  `{product.categoryName}`.
- `app/(employee)/dashboard/products/ProductsContent.tsx:121` — coluna
  da tabela `render: (p) => p.categoryName`; o filtro admin (linhas
  ~191-195, `<Select value={categoryId}>`) **fica como está** (decisão
  confirmada — admin continua por UUID).
- `app/(employee)/dashboard/products/new/ProductCreateContent.tsx:30-43`
  e `.../[id]/edit/ProductEditContent.tsx:35,59-72` — montam o body do
  `POST`/`PUT` espalhando `...form` (que hoje tem `categoryId`) e
  adicionam um campo `categoryName` que **não existe em nenhum DTO do
  backend** (`CreateProductRequest`/`UpdateProductRequest` não têm esse
  campo) — código morto, será removido junto da troca.

## 2. Testes a incluir/alterar

**`components/forms/__tests__/ProductForm.test.tsx`** (criar se não
existir, ou estender)

- Renderiza um `Checkbox` por categoria disponível (`categories`
  prop); marcar duas categorias reflete em `form.categoryIds` (via
  `onFormChange`).
- Com 2+ categorias marcadas, aparece um `<Select>` "Categoria
  principal" cujas opções são só as categorias marcadas; trocar a
  seleção reordena `categoryIds` para que a escolhida fique no índice
  0.
- Com exatamly 1 categoria marcada, não é preciso escolher principal
  (select de principal não aparece, ou aparece já fixo/desabilitado).
- Botão "Salvar" fica desabilitado/bloqueado sem nenhuma categoria
  marcada (mesma trava que hoje existe com o `required` do `Select`
  único).

**`app/(employee)/__tests__/products.page.test.tsx`** (existente,
ajustar mocks)

- Mocks de `Product` passam a ter `categories: Category[]` em vez de
  `categoryId`/`categoryName`.
- Coluna "Categoria" da tabela mostra a categoria principal
  (`categories[0].name`).

**`ProductCreateContent`/`ProductEditContent`** (se já houver teste
cobrindo o submit — verificar `__tests__` das respectivas pastas antes
de escrever; se não houver, não é obrigatório criar um novo só para
isso, mas os testes existentes que checam o body enviado devem passar
a esperar `categoryIds: string[]` e **não** `categoryName`)

**Testes de `CatalogPagination`/`CatalogSearch`** (se existirem —
verificar `__tests__` das respectivas pastas): prop `categoryId` →
`category` (slug), URL gerada passa a ser `?category=<slug>`.

**`components/product/__tests__/ProductCard.test.tsx`** (existente,
ajustar): badge de categoria usa `product.categories[0]?.name`.

## 3. O que entra no projeto

### Tipos

- `types/index.ts`: `Product.categoryId`/`categoryName` →
  `categories: Category[]` (reaproveita o `Category` já existente).

### Componentes

- `components/forms/ProductForm.tsx`:
  - `ProductFormState.categoryId: string` → `categoryIds: string[]`
    (`EMPTY_PRODUCT_FORM.categoryIds = []`).
  - Troca o `<Select>` único por um bloco de `Checkbox` (um por
    categoria disponível, mesmo padrão do dialog de permissões de
    `employees/page.tsx`), dentro de um `FormField label="Categorias"`.
  - Quando `categoryIds.length > 1`, mostra um `<Select>` adicional
    "Categoria principal" com as categorias marcadas como opções;
    escolher uma reordena `categoryIds` (a escolhida vai para o
    índice 0). Com 0 ou 1 categoria marcada, não precisa desse select.
- `components/product/ProductCard.tsx`: `product.categoryName` →
  `product.categories[0]?.name`.
- `app/(public)/catalog/[slug]/page.tsx`:
  - Breadcrumb (linha 98): usa a categoria principal
    (`product.categories[0]`), `href` vira
    `/catalog?category=${product.categories[0]?.slug}`.
  - Badges (linha ~121-125): em vez de um badge único, lista **todas**
    as categorias do produto (um `Badge` por item de
    `product.categories`) — página de detalhe é o lugar natural para
    mostrar a lista completa, conforme decisão confirmada.
- `app/(public)/catalog/page.tsx`: `fetchProducts(categoryId, ...)` →
  `fetchProducts(categorySlug, ...)`, parâmetro de querystring
  `categoryId` → `category`; `searchParams` tipado com `category` em
  vez de `categoryId`; links de filtro por categoria usam `cat.slug`
  em vez de `cat.id`; prop repassada a `CatalogPagination` renomeada.
- `components/catalog/CatalogSearch.tsx` /
  `components/catalog/CatalogPagination.tsx`: prop `categoryId` →
  `category` (slug), usada tal qual na querystring montada.
- `app/(employee)/dashboard/products/ProductsContent.tsx`: linha 121
  (`render: (p) => p.categoryName`) → `p.categories[0]?.name ?? '—'`.
  Filtro por `categoryId` (state e `<Select>`) **não muda**.
- `app/(employee)/dashboard/products/new/ProductCreateContent.tsx` e
  `.../[id]/edit/ProductEditContent.tsx`: `categoryId` no estado/body
  → `categoryIds: string[]`; ao popular o form de edição,
  `categoryIds: product.categories.map((c) => c.id)`; remove o campo
  `categoryName` morto do body enviado (não existe no DTO do backend).

### base-ds

- Abrir issue em `indianous/base-ds` pedindo um componente de
  multi-select/combobox (selecionar múltiplos itens de uma lista fixa
  de opções, com label + valor, diferente do `TagsInput` que é texto
  livre) — antes de implementar o workaround local com `Checkbox`
  acima. Quando o componente existir, o bloco de `Checkbox` do
  `ProductForm.tsx` deve ser trocado por ele.

Fora de escopo: página dedicada de categoria por slug (algo como
`/catalog/category/[slug]` — hoje o filtro é só via querystring na
própria `/catalog`, isso não muda), filtro admin por slug (mantém
UUID), edição/remoção de categoria (gap pré-existente no backend, não
pedido).
