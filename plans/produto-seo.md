# SEO de produtos: slug e metadados (frontend)

## Contexto

Complementa `backend/plans/produto-seo.md`. A URL pública do produto muda
de `/catalog/{uuid}` para `/catalog/{slug}`; links antigos por UUID
recebem redirecionamento permanente para não perder indexação/tráfego já
existente.

## 1. Problemas encontrados

- `app/(public)/catalog/[id]/page.tsx:22-30,46-51` (`fetchProduct`,
  `generateMetadata`) busca por
  `GET /catalog/products/{id}` (UUID) e monta `<title>`/`description` só
  com `product.name`/`product.description` — sem usar
  `metaTitle`/`metaDescription` (que ainda não existem no tipo `Product`).
- `components/product/ProductCard.tsx:47`
  (`href={`/catalog/${product.id}`}`) — todo link para produto no catálogo
  usa UUID; precisa virar `product.slug`.
- `types/index.ts:69-84` (`Product`) não tem `slug`/`metaTitle`/
  `metaDescription`.
- `components/forms/ProductForm.tsx` (campos atuais: `name`, `price`,
  `categoryId`, `imageUrl` — linhas 7-19) não tem campos para slug/meta —
  o admin não tem como definir/editar esses dados.
- Trocar a pasta de rota `catalog/[id]` para `catalog/[slug]` sem cuidado
  quebra qualquer link externo/compartilhado já indexado pelo UUID
  (histórico de pedidos, favoritos salvos, resultados de busca já
  indexados) — precisa de fallback.

## 2. Testes a incluir/alterar

**`app/(public)/__tests__/catalog.product-detail.page.test.tsx`** (estender
— já existe, criado em `avaliacoes-produto.md`)

- SSR por slug: `GET /api/v1/catalog/products/slug/{slug}` mockado →
  renderiza normalmente, `generateMetadata` usa `metaTitle`/
  `metaDescription` quando presentes, caindo para `name`/`description`
  quando ausentes (produtos antigos sem SEO preenchido).
- acessar a rota com um UUID válido (produto existente) → redireciona
  (`redirect()` do Next.js) para `/catalog/{slug}` do mesmo produto.
- slug inexistente e UUID inexistente → `notFound()`.

**`components/forms/__tests__/ProductForm.test.tsx`** (estender, arquivo já
deve existir dado que `ProductForm` tem validação própria)

- campos "Slug", "Meta título", "Meta descrição" renderizam e propagam via
  `onFormChange`.
- "Slug" vazio não bloqueia o submit (backend gera automaticamente) — sem
  validação obrigatória no client.

**`components/product/__tests__/ProductCard.test.tsx`** (estender, arquivo
já existe)

- link do card aponta para `/catalog/{product.slug}`, não mais para
  `product.id`.

## 3. O que entra no projeto

### Tipos

`types/index.ts` (`Product`, linhas 69-84): adiciona `slug: string`,
`metaTitle?: string`, `metaDescription?: string`.

### BFF

Nenhuma rota BFF nova — a busca do produto na página pública já é SSR
direto no backend (`API_INTERNAL_URL`, padrão existente em
`catalog/[id]/page.tsx:9`, documentado como não-violação do BFF em
`avaliacoes-produto.md`); o mesmo padrão vale para a busca por slug.
`app/api/admin/products/*` (mutações do admin) já passa pelo BFF existente
e simplesmente passa a incluir os campos novos no corpo.

### Componentes

- `components/forms/ProductForm.tsx` — adiciona campos "Slug" (opcional,
  com texto de ajuda "gerado automaticamente se deixado em branco"), "Meta
  título" e "Meta descrição" (`FormField` + `input`/`textarea`, mesmo
  padrão dos demais campos do form).
- `components/product/ProductCard.tsx:47` — troca `product.id` por
  `product.slug` no `href`.

### Páginas

- Renomeia `app/(public)/catalog/[id]/` → `app/(public)/catalog/[slug]/`.
  `fetchProduct` passa a chamar
  `GET /catalog/products/slug/{slug}`; se retornar 404, tenta
  `GET /catalog/products/{slug}` (tratando o param como possível UUID —
  compatibilidade com links antigos); se encontrar por esse caminho,
  chama `redirect(`/catalog/${product.slug}`)` do
  `next/navigation` para consolidar na URL canônica; se nenhum dos dois
  encontrar, `notFound()`.
  `generateMetadata` (linhas 46-51) passa a usar `product.metaTitle ??
  product.name` e `product.metaDescription ?? product.description`.
- `app/(public)/catalog/page.tsx` (listagem) e qualquer outro lugar que
  monte link de produto (buscar por `product.id` em `href`/`Link` fora do
  `ProductCard`, se houver) — atualizar para usar `slug`.
