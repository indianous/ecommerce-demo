# Grade de produtos do catálogo — busca, ordenação e loading (frontend)

## Contexto

Complementa `backend/plans/11-grade-produtos-catalogo.md`. Escopo
confirmado: só o grid do catálogo público
(`app/(public)/catalog/page.tsx`), que já existe hoje como um grid
responsivo básico de `ProductCard`. Três melhorias entram:

1. **Loading state** — hoje não existe nenhum, tela fica em branco
   durante busca/paginação/troca de filtro.
2. **Ativar busca** — `CatalogSearch.tsx` já existe, já monta a URL
   certa, mas **nunca é renderizado** em `catalog/page.tsx`. O backend
   já aceita `search` — é 100% gap de frontend.
3. **Ordenação** (preço/nome/novidade) — depende do novo parâmetro
   `sort` do backend (plano irmão).

**Sobreposição com outros planos pendentes no mesmo arquivo**: este
plano toca `app/(public)/catalog/page.tsx` nos mesmos pontos que
`frontend/plans/migracao-link-nextjs.md` (troca dos `<a>` de categoria
por `<Link>`) e que `frontend/plans/10-categorias-multiplas-produto.md`
(parâmetro `categoryId` vira `category`/slug). Como este plano já
precisa reescrever os links de categoria para preservar busca/sort ao
clicar, a implementação abaixo já assume `<Link>` diretamente — se
`migracao-link-nextjs.md` for implementado antes, seu trecho sobre
`catalog/page.tsx` fica redundante (nada quebra, só vira trabalho já
feito). Se `10-categorias-multiplas-produto.md` for implementado antes
deste, trocar `categoryId` por `category` (slug) em todo este plano
antes de seguir — escrito aqui contra o estado **atual** do código
(ainda `categoryId`).

## 1. Problemas encontrados

- Nenhum arquivo `app/(public)/catalog/loading.tsx` existe — sem
  convenção de loading do App Router aplicada a essa rota, ao
  contrário do padrão já usado com `Skeleton` do `base-ds` em todo o
  dashboard (`OrdersContent.tsx`, `CustomersContent.tsx`,
  `PaymentsContent.tsx` etc.).
- `components/catalog/CatalogSearch.tsx` existe, tem lógica completa
  (`handleSearch` monta `/catalog?categoryId=...&search=...`), mas
  **não é importado em lugar nenhum** — confirmado por grep, é
  código morto hoje.
- `app/(public)/catalog/page.tsx:13-26` (`fetchProducts`) não manda
  `sort` pro backend; `searchParams` (linha 39) não tem `sort`.
- `app/(public)/catalog/page.tsx:56,60-66` — links de categoria são
  `<a>` puro e **não preservam `search`** ao trocar de categoria (só
  montam `?categoryId=${cat.id}`, descartando qualquer busca ativa) —
  isso já é um problema hoje, mas fica pior ao ativar a busca de
  verdade: usuário digita algo, clica numa categoria, a busca some sem
  aviso.
- `components/catalog/CatalogPagination.tsx:6-11` só recebe
  `categoryId`/`search` como prop — sem `sort`, paginar resetaria
  qualquer ordenação escolhida.
- A lógica de montar `URLSearchParams` está **duplicada** entre
  `CatalogSearch.tsx:14-19` e `CatalogPagination.tsx:18-23` (mesmo
  padrão, dois lugares) — ao adicionar `sort` a mais um lugar (e mais
  um componente novo de ordenação), isso viraria 3 cópias da mesma
  lógica se não for extraída.
- `types/index.ts` não tem um tipo para as opções de ordenação.

## 2. Testes a incluir/alterar

**`components/catalog/__tests__/catalogUrl.test.tsx`** (novo — unit
puro, sem React, testando a função helper)

- Sem nenhum parâmetro → `/catalog`.
- Só `search` → `/catalog?search=teclado`.
- `categoryId` + `search` + `sort` + `page` juntos → todos presentes na
  ordem esperada.
- `sort = 'NAME_ASC'` (valor default do backend) é **omitido** da URL
  (evita poluir a querystring com o valor que já é o padrão).
- `page = 1` é omitido (mesmo comportamento atual).

**`components/catalog/__tests__/CatalogSearch.test.tsx`** (estender —
já existem 2 testes, ver arquivo atual)

- Novo teste: "preserva o sort atual ao buscar" — renderizar com
  `sort="PRICE_ASC"`, buscar, `pushMock` chamado com
  `/catalog?sort=PRICE_ASC&search=...`.

**`components/catalog/__tests__/CatalogPagination.test.tsx`** (estender
— já existem 2 testes)

- Novo teste: "preserva o sort atual ao paginar" — mesma ideia.

**`components/catalog/__tests__/CatalogSort.test.tsx`** (novo)

- Renderiza um `Select` com as 4 opções (Nome A-Z, Menor preço, Maior
  preço, Mais recentes).
- Valor inicial reflete a prop `value` recebida.
- Trocar a opção chama `router.push` com a nova URL, preservando
  `categoryId`/`search` atuais e **resetando `page`**.

**`app/(public)/catalog/__tests__/loading.test.tsx`** (novo — não
precisa dos mocks de fetch/MSW do `catalog.page.test.tsx`, é um
componente estático)

- Renderiza N cards de skeleton dentro de um container com
  `role="status"` e `aria-label` acessível (ex.: "Carregando
  produtos").
- Quantidade de skeletons bate com o tamanho de página default (ex.:
  8, mesmo grid `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
  usado no grid real).

**`app/(public)/__tests__/catalog.page.test.tsx`** (estender — já
existe, usa `await CatalogPage({searchParams}); render(jsx)`)

- `CatalogSearch` agora aparece renderizado na página (hoje não
  aparece) — `screen.getByRole('textbox', { name: /search input/i })`.
- `CatalogSort` aparece renderizado, com a opção correspondente a
  `searchParams.sort` selecionada (ou "Nome A-Z" quando ausente).
- `fetchProducts` inclui `sort` na querystring enviada ao backend
  quando `searchParams.sort` está presente (mesmo padrão do teste
  existente "requests the requested page").
- Links de categoria preservam `search`/`sort` atuais ao montar o
  `href` (com `search`/`sort` presentes nos `searchParams` de entrada,
  o link de uma categoria inclui os três: `categoryId`, `search`,
  `sort`).

## 3. O que entra no projeto

### Tipos

- `types/index.ts`: `export type ProductSort = 'NAME_ASC' | 'PRICE_ASC' | 'PRICE_DESC' | 'NEWEST'`
  (espelha exatamente os nomes das constantes do enum `ProductSort` do
  backend — mesmo padrão já usado para `ProductStatus`,
  `EmployeePermission` etc.).

### Componentes novos

- `components/catalog/catalogUrl.ts` — helper puro compartilhado pelos
  3 componentes client abaixo, elimina a duplicação de
  `URLSearchParams` apontada na seção 1:
  ```ts
  export function buildCatalogUrl(params: {
    categoryId?: string
    search?: string
    sort?: ProductSort
    page?: number
  }): string {
    const usp = new URLSearchParams()
    if (params.categoryId) usp.set('categoryId', params.categoryId)
    if (params.search) usp.set('search', params.search)
    if (params.sort && params.sort !== 'NAME_ASC') usp.set('sort', params.sort)
    if (params.page && params.page > 1) usp.set('page', String(params.page))
    const qs = usp.toString()
    return `/catalog${qs ? `?${qs}` : ''}`
  }
  ```
- `components/catalog/CatalogSort.tsx` (novo, client component, mesmo
  padrão de `CatalogSearch`/`CatalogPagination`): `Select` do
  `base-ds` com as 4 opções (`NAME_ASC` = "Nome (A-Z)", `PRICE_ASC` =
  "Menor preço", `PRICE_DESC` = "Maior preço", `NEWEST` = "Mais
  recentes"); `onChange` usa `buildCatalogUrl` preservando
  `categoryId`/`search`, sem `page` (reseta para 1).
- `app/(public)/catalog/loading.tsx` (novo): grid de skeletons no
  mesmo layout do grid real (`grid grid-cols-1 gap-6 sm:grid-cols-2
  md:grid-cols-3 lg:grid-cols-4`), cada item com `Skeleton
  variant="rect"` no formato do `ProductCard` (imagem `aspect-[3/4]` +
  linhas pro badge/título/preço), container com `role="status"
  aria-label="Carregando produtos"` — mesmo padrão de acessibilidade
  já usado em `OrdersContent.tsx:93-97`.

### Componentes existentes

- `components/catalog/CatalogSearch.tsx`: usa `buildCatalogUrl`
  internamente em vez da montagem manual de `URLSearchParams`; ganha
  prop `sort?: ProductSort` (preservada ao buscar).
- `components/catalog/CatalogPagination.tsx`: idem, usa
  `buildCatalogUrl`; ganha prop `sort?: ProductSort`.
- `app/(public)/catalog/page.tsx`:
  - `fetchProducts(categoryId?, search?, sort?, page)` — inclui
    `sort` na querystring pro backend quando presente.
  - `searchParams` ganha `sort?: string`.
  - Renderiza `<CatalogSearch defaultValue={search ?? ''} categoryId={categoryId} sort={sort} />`
    (hoje ausente).
  - Renderiza `<CatalogSort value={sort ?? 'NAME_ASC'} categoryId={categoryId} search={search} />`
    perto do topo do grid.
  - Links de categoria (`import Link from 'next/link'`) usam
    `buildCatalogUrl({ categoryId: cat.id, search, sort })` em vez de
    template string manual — preserva busca/ordenação ao trocar de
    categoria.
  - Repassa `sort` pra `<CatalogPagination>`.

Fora de escopo: grid/visualização em grade no admin (continua tabela),
filtros adicionais além dos 3 já existentes (categoria/busca/ordenação),
qualquer mudança visual no `ProductCard` em si.
