# Avaliações de produto (frontend)

## Contexto

Complementa `backend/plans/avaliacoes-produto.md`. Nova página pública
`/catalog/[id]` com informações do produto, nota média (`Rating` do
`base-ds`, `readOnly`), lista de avaliações com fotos, e formulário de
avaliação (estrelas + comentário + upload de fotos) para cliente logado que
comprou e recebeu o produto. Moderação (excluir avaliação) fica no dashboard
employee/admin, junto da edição de produto.

## 1. Problemas encontrados

- Não existe rota `app/(public)/catalog/[id]/page.tsx` — hoje o catálogo
  (`app/(public)/catalog/page.tsx`) só lista produtos em grid; o
  `ProductCard` (`components/product/ProductCard.tsx:46-98`) é um `Card`
  solto, sem link — clicar num produto não leva a lugar nenhum.
- `types/index.ts` (`Product`, ~linha 68-79) não tem
  `averageRating`/`reviewCount`; não existe nenhum tipo `ProductReview*`.
- `base-ds` não exporta `Textarea`/`TextArea` (mesmo gap já documentado em
  `frontend/plans/aprovacao-manual-pagamentos.md`). Precedente já aceito no
  projeto: `<textarea>` nativo dentro de `FormField`
  (`components/forms/RejectPaymentForm.tsx:25-32`,
  `.../dashboard/orders/[id]/OrderDetailContent.tsx:227`). Vou seguir o mesmo
  padrão para o campo de comentário da avaliação — sem abrir issue nova no
  `base-ds`.
- `base-ds` já tem `Rating` (`molecules/Rating/Rating.tsx`, suporta
  `value`/`onChange`/`readOnly`/`size`) e `FileUpload` com `multiple`
  (`molecules/FileUpload/FileUpload.tsx:9,25`) — cobrem estrelas e upload de
  fotos sem precisar de componente novo no design system.
- `app/(public)/catalog/page.tsx:11-26` busca o backend diretamente do
  servidor (`API_INTERNAL_URL`), sem passar por `app/api/*` — é o padrão já
  usado para leitura pública em Server Component (SSR); não é uma violação do
  "BFF obrigatório" do `CLAUDE.md`, que vale para chamadas feitas do browser.
  Vou seguir o mesmo padrão para o SSR da página de detalhe + lista de
  avaliações; só as mutações disparadas do client (criar/editar/excluir
  avaliação, checar elegibilidade, upload de foto) passam por `app/api/*`,
  replicando `app/api/orders/route.ts:5-21`.
- `app/api/upload/image/route.ts` já repassa `Authorization` e faz proxy
  multipart — reutilizável para foto de avaliação sem nenhuma alteração (a
  mudança de permissão fica só no backend).
- O token de acesso só existe no client (`stores/auth.store.ts` — hidratado
  via cookie de refresh, não acessível no Server Component), então a checagem
  de elegibilidade não pode vir no SSR da página — precisa ser buscada pelo
  client component depois de montado (mesmo padrão de
  `ProductEditContent.tsx:21-41`, que busca dados autenticados em
  `useEffect`).

## 2. Testes a incluir/alterar

**`app/(public)/__tests__/catalog.product-detail.page.test.tsx`** (novo)

- SSR: `GET /api/v1/catalog/products/{id}` mockado (MSW) → renderiza nome,
  descrição, preço formatado, categoria, nota média (`Rating readOnly` com
  `value` correto), `reviewCount`.
- produto sem avaliação → mostra "Sem avaliações ainda" em vez da nota.
- `GET /api/v1/products/{id}/reviews` mockado → lista os comentários + fotos
  das avaliações existentes, com paginação.
- produto inexistente (`404` do backend) → `notFound()` do Next.js.

**`components/product/__tests__/ProductRatingSummary.test.tsx`** (novo)

- renderiza `Rating readOnly` com a nota média arredondada e o texto
  "`{reviewCount}` avaliações".
- `reviewCount === 0` → "Seja o primeiro a avaliar".

**`components/forms/__tests__/ReviewForm.test.tsx`** (novo — tem validação
própria: nota obrigatória, então ganha teste dedicado por convenção)

- botão "Enviar avaliação" desabilitado sem selecionar estrelas.
- seleciona nota (`Rating onChange`) + digita comentário → habilita.
- `FileUpload` aceita múltiplos arquivos de imagem, `onImagesChange`
  chamado com a lista.
- chama `onSubmit` com `{rating, comment, images}`.
- exibe erro passado via prop `error` (ex.: "Você precisa comprar o produto
  para avaliá-lo").

**`components/product/__tests__/ProductReviewsSection.test.tsx`** (novo —
client component que orquestra estado/fetch, mesmo papel de
`ProductsContent.tsx`)

- cliente não logado → mostra CTA "Entrar para avaliar" em vez do
  formulário.
- cliente logado, `GET .../reviews/me` retorna `eligible:false` → formulário
  não aparece, mensagem explicando o motivo.
- cliente logado elegível, `alreadyReviewed:false` → formulário aparece; ao
  enviar, sobe imagens antes via `POST /api/upload/image` (uma chamada por
  arquivo), depois `POST /api/products/{id}/reviews`; lista atualiza, toast
  de sucesso.
- `alreadyReviewed:true` → formulário pré-preenchido com a própria avaliação;
  botão "Salvar" dispara `PUT`; botão "Excluir" dispara `DELETE`.
- erro 403/409 do backend → toast de erro com a mensagem retornada pela API.

**`.../dashboard/products/[id]/reviews/__tests__/ProductReviewsModerationContent.test.tsx`**
(novo)

- lista avaliações do produto (`GET` público, sem token).
- clique em "Remover" → `Dialog` de confirmação → `DELETE
  /api/admin/products/{id}/reviews/{reviewId}` com token → item some da
  lista, toast de sucesso.
- `PermissionGuard` bloqueia quem não tem `MANAGE_PRODUCTS`/`ADMIN` (mesmo
  padrão de `ProductsContent`).

**`components/product/__tests__/ProductCard.test.tsx`** (existente —
estender)

- **novo**: `Card` renderiza dentro de um link para `/catalog/{product.id}`
  (regressão do problema encontrado).
- **novo**: mostra `Rating readOnly size="sm"` quando `product.reviewCount >
  0`; não mostra nada quando `reviewCount` é `0`.

## 3. O que entra no projeto

**Tipos** (`types/index.ts`):

- `Product`: adiciona `averageRating?: number`, `reviewCount: number`.
- novo `ProductReview`: `{ id, productId, userId, userName, rating, comment,
  imageUrls, createdAt, updatedAt }`.
- novo `ProductReviewPage`: `{ content: ProductReview[], page, size,
  totalElements, totalPages, last, averageRating: number | null,
  totalReviews: number }`.
- novo `ReviewEligibility`: `{ eligible: boolean, alreadyReviewed: boolean,
  review: ProductReview | null }`.

**BFF** (novo, mesmo padrão de `app/api/orders/route.ts` — repassa
`Authorization`, proxy 1:1 para o backend):

- `app/api/products/[id]/reviews/route.ts`: `POST` (cria).
- `app/api/products/[id]/reviews/me/route.ts`: `GET` (elegibilidade).
- `app/api/products/[id]/reviews/[reviewId]/route.ts`: `PUT`/`DELETE`
  (edita/exclui a própria avaliação).
- `app/api/admin/products/[id]/reviews/[reviewId]/route.ts`: `DELETE`
  (moderação, mesmo padrão de `app/api/admin/products/[id]/route.ts`).
- `app/api/upload/image/route.ts`: sem mudança (já serve para foto de
  avaliação).

**Componentes**:

- `components/product/ProductRatingSummary.tsx` (novo, puro): `Rating
  readOnly` + texto de contagem.
- `components/product/ProductReviewCard.tsx` (novo, puro): nota, nome do
  autor, data, comentário, grid de `Image` (`base-ds`) para as fotos.
- `components/product/ProductReviewsSection.tsx` (novo, client — detém
  estado/fetch, mesmo papel de `ProductsContent.tsx`/`PaymentsContent.tsx`):
  busca elegibilidade no mount, lista avaliações, decide o que mostrar (CTA
  login / motivo de inelegibilidade / formulário / formulário preenchido),
  sobe imagens e chama o BFF.
- `components/forms/ReviewForm.tsx` (novo, puro/controlado): `Rating`
  (estrelas), `FormField` + `<textarea>` nativo (comentário), `FileUpload`
  (`multiple`, `accept="image/jpeg,image/png,image/webp,image/gif"`),
  botões "Enviar"/"Salvar"/"Cancelar" conforme modo criar/editar.
- `components/product/ProductCard.tsx:46-98`: envolve o `Card` num `Link`
  (`next/link`) para `/catalog/{product.id}`; adiciona `Rating readOnly
  size="sm"` quando `reviewCount > 0`.

**Páginas**:

- `app/(public)/catalog/[id]/page.tsx` (novo, Server Component): SSR direto
  ao backend (mesmo padrão de `catalog/page.tsx`) — busca produto (`404` →
  `notFound()`) e primeira página de avaliações; renderiza
  `ProductRatingSummary`, lista de `ProductReviewCard`, paginação, e
  `<ProductReviewsSection productId reviews={initialReviews} />` (a seção
  busca elegibilidade sozinha no client, por não ter token no SSR).
- `.../dashboard/products/[id]/reviews/ProductReviewsModerationContent.tsx`
  (novo, client, recebe `basePath` como `PaymentsContent`): lista avaliações
  do produto com botão remover.
- `.../dashboard/products/[id]/reviews/page.tsx` e
  `.../dashboard/admin/products/[id]/reviews/page.tsx` (novos): renderizam
  `ProductReviewsModerationContent` dentro de `PermissionGuard
  permission="MANAGE_PRODUCTS"` (espelha o padrão `employee`/`admin`
  existente).
- `.../dashboard/products/[id]/edit/ProductEditContent.tsx`: adiciona link
  "Ver avaliações" apontando para a nova rota de moderação.
