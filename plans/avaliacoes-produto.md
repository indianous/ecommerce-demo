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
  padrão para o campo de comentário da avaliação — issue aberta em
  `indianous/base-ds#11` pedindo o componente.
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

## Incremento — página "Minhas Avaliações" (nova página do cliente)

Complementa `backend/plans/avaliacoes-produto.md#incremento`. Decisão
confirmada com o usuário (retificada — editar continua permitido): o
formulário de criar/editar avaliação sai da página pública do produto
(`ProductReviewsSection.tsx`) e passa a viver numa nova página do cliente
`app/(customer)/reviews/page.tsx` ("Minhas Avaliações"), acessível pelo
dropdown do usuário logo abaixo de "Meus Pedidos". Essa página lista os
produtos comprados (`DELIVERED`): os ainda não avaliados mostram botão
"Avaliar" (abre o `ReviewForm` num `Dialog`, cria via `POST`); os já
avaliados mostram a própria avaliação com botões "Editar" (reabre o mesmo
`Dialog` pré-preenchido, salva via `PUT`) e "Excluir". As fotos continuam
aparecendo na página pública do produto via `ProductReviewCard` — **isso já
funciona hoje, nenhuma mudança necessária nesse ponto**.

### 1. Problemas encontrados

- `components/product/ProductReviewsSection.tsx:40,47-60` busca elegibilidade
  por produto único (`GET /api/products/{id}/reviews/me`) e
  `ProductReviewsSection.tsx:151-174` renderiza o `ReviewForm` inline com
  lógica de criar/editar (`isEditing`, linha 78) — todo esse bloco (linhas
  40-46, 47-60, 72-127, 135-175) deixa de fazer sentido: a página pública do
  produto passa a ser só leitura (lista de `ProductReviewCard`).
- `components/product/ProductReviewsSection.tsx:62-70` (`refreshReviews`)
  chama `GET /api/products/{id}/reviews?page=...`, mas
  `app/api/products/[id]/reviews/route.ts` só exporta `POST` (linhas 5-24) —
  **bug pré-existente**: paginação client-side da lista de avaliações do
  produto hoje responde 405. Precisa de `export async function GET` nessa
  rota (proxy simples para `GET {API}/products/{id}/reviews?page=&size=`,
  mesmo padrão do `POST` já existente) para a seção da página do produto
  continuar paginando depois da simplificação.
- `app/api/products/[id]/reviews/[reviewId]/route.ts:5-24` (`PUT`) e
  linhas 26-43 (`DELETE`) não mudam — passam a ser chamados pela nova página
  em vez de `ProductReviewsSection.tsx`.
- `app/api/products/[id]/reviews/me/route.ts` (arquivo inteiro) fica sem uso
  — substituído pelo novo `GET /api/reviews/me`.
- `components/layout/UserMenu.tsx:41-47` não tem item para a nova página —
  falta `{ label: 'Minhas Avaliações', href: '/reviews' }` logo após "Meus
  Pedidos" (linha 44).
- `types/index.ts:321-325` (`ReviewEligibility`) fica sem uso depois de
  remover a eligibility por produto — substituído por um novo tipo em lote.
- Não existe `app/(customer)/reviews/page.tsx` — convenção do grupo
  `app/(customer)/` (`orders/page.tsx` é o modelo mais próximo: client
  component, fetch com `accessToken`, loading state, paginação client-side
  com `Pagination` do base-ds, `PAGE_SIZE`).

### 2. Testes a incluir/alterar

**`components/product/__tests__/ProductReviewsSection.test.tsx`** (existente
— reescrever)
- **Remover** os cenários de formulário/elegibilidade/editar/excluir (CTA
  "Entrar para avaliar" pode continuar ou sair — decidir ao implementar; os
  demais — inelegível, elegível com form, já avaliou com form preenchido,
  editar, excluir — saem daqui, pois a seção deixa de ter form; editar e
  excluir passam a ser cobertos em `reviews.page.test.tsx`).
- **Manter/simplificar**: renderiza `reviewList` via `ProductReviewCard`,
  mostra "Ainda não há avaliações..." quando vazio, pagina corretamente
  (cobre a correção do bug de `GET` no BFF).

**`app/api/products/[id]/__tests__/reviews.route.test.ts`** (novo, se o
projeto testa BFF routes isoladamente — senão a cobertura fica só indireta
via `ProductReviewsSection.test.tsx` com MSW)
- `GET /api/products/{id}/reviews?page=1` faz proxy para
  `GET {API}/products/{id}/reviews?page=1` e repassa o status/corpo.

**`components/forms/__tests__/ReviewForm.test.tsx`** (existente)
- Sem mudanças — o form já é puro e reaproveitável como está (confirmado:
  não tem lógica própria de "editar", só recebe `rating`/`comment`/`images`
  controlados e `onSubmit`); passa a ser renderizado de dentro de um
  `Dialog` na nova página, mas isso não muda o teste do form isoladamente.

**`app/(customer)/__tests__/reviews.page.test.tsx`** (novo, mesmo padrão de
`orders.page.test.tsx` — MSW + Testing Library + `useAuthStore.setState`)
- estado vazio: `GET /api/reviews/me` retorna `[]` → "Nenhum produto
  disponível para avaliação." (ou texto equivalente).
- produto sem avaliação (`review: null`) → mostra nome/imagem do produto e
  botão "Avaliar"; clicar abre `Dialog` com `ReviewForm`.
- preenche nota + comentário + fotos no `Dialog` e confirma → sobe imagens
  via `POST /api/upload/image` (uma chamada por arquivo, mesma lógica hoje em
  `ProductReviewsSection.tsx:16-31`, que migra para essa página), depois
  `POST /api/products/{id}/reviews`; `Dialog` fecha, item passa a mostrar a
  avaliação em vez do botão "Avaliar", toast de sucesso.
- produto já avaliado (`review` preenchido) → mostra `ProductReviewCard` (ou
  exibição equivalente) com a nota/comentário/fotos e botões "Editar" e
  "Excluir avaliação".
- clicar "Editar" → abre `Dialog` com `ReviewForm` pré-preenchido
  (`rating`/`comment` da avaliação existente); confirma → `PUT
  /api/products/{productId}/reviews/{reviewId}` (sem re-upload das fotos já
  salvas — só reenvia `imageUrls` se o cliente trocar os arquivos no
  `FileUpload`); `Dialog` fecha, item atualiza com a avaliação retornada,
  toast de sucesso.
- clicar "Excluir avaliação" → `Dialog`/confirmação → `DELETE
  /api/products/{productId}/reviews/{reviewId}` → item volta a mostrar
  "Avaliar", toast de sucesso.
- erro do backend ao criar/editar (ex.: 409 "já avaliou" em corrida) → toast
  de erro com a mensagem da API, `Dialog` permanece aberto.

**`components/layout/__tests__/UserMenu.test.tsx`** (existente — estender)
- novo teste análogo ao de "Meus Pedidos" (linha 73): dropdown mostra link
  "Minhas Avaliações" apontando para `/reviews` quando autenticado.

### 3. O que entra no projeto

**Tipos** (`types/index.ts`):
- Remove `ReviewEligibility` (linhas 321-325) — sem uso depois do
  incremento.
- Novo `MyReviewableProduct`: `{ productId: string, productName: string,
  productImageUrl?: string, review: ProductReview | null }`.

**BFF**:
- `app/api/products/[id]/reviews/route.ts`: adiciona `export async function
  GET` (proxy para `GET {API}/products/{id}/reviews?page=&size=`, repassando
  query params — mesmo padrão do `POST` já existente no arquivo). Corrige o
  bug de paginação encontrado no item 1.
- `app/api/products/[id]/reviews/[reviewId]/route.ts`: sem mudanças — `PUT`
  e `DELETE` continuam existindo, só passam a ser chamados a partir da nova
  página.
- `app/api/products/[id]/reviews/me/route.ts`: **remove o arquivo** (rota de
  backend removida).
- `app/api/reviews/me/route.ts` (novo): `GET`, proxy simples para `GET
  {API}/reviews/me` repassando `Authorization` — mesmo padrão de
  `app/api/orders/route.ts`.

**Componentes**:
- `components/product/ProductReviewsSection.tsx`: simplifica para
  componente só-leitura — remove estado/lógica de `eligibility`, `rating`,
  `comment`, `images`, `submitting`, `error`, `handleSubmit`, `handleDelete`,
  o bloco `<ReviewForm .../>` e o botão "Excluir avaliação"; mantém
  `reviewList`/paginação/`ProductReviewCard`. `uploadImages` (linhas 16-31)
  migra para a nova página (deixa de existir aqui). Isso vale
  independentemente de editar continuar permitido — o form (criar e editar)
  sai da página do produto de qualquer forma.
- `components/forms/ReviewForm.tsx`: nenhuma mudança de código — já é puro e
  reaproveitável tanto para criar quanto para editar (o container decide
  `POST` vs `PUT`); passa a ser usado dentro de um `Dialog` (`base-ds`) em
  vez de inline na página do produto.

**Páginas**:
- `app/(customer)/reviews/page.tsx` (novo, client component, mesmo padrão de
  `orders/page.tsx`): busca `GET /api/reviews/me` com `accessToken` no
  mount; para cada item sem `review`, mostra card do produto (nome + imagem,
  `Image` do base-ds) com botão "Avaliar" que abre `Dialog` contendo
  `ReviewForm` vazio (estado de `rating`/`comment`/`images` mora na página,
  mesmo padrão "pai detém estado" do `CLAUDE.md`); ao confirmar, sobe
  imagens (função `uploadImages` migrada de `ProductReviewsSection.tsx`) e
  faz `POST /api/products/{productId}/reviews`, fecha o `Dialog`, atualiza o
  item localmente com a avaliação retornada. Para item com `review`
  preenchido, mostra `ProductReviewCard` (ou markup equivalente) + botões
  "Editar" (abre o mesmo `Dialog`/`ReviewForm`, agora pré-preenchido com
  `rating`/`comment` da avaliação existente; confirma → `PUT
  /api/products/{productId}/reviews/{reviewId}`) e "Excluir avaliação"
  (`DELETE /api/products/{productId}/reviews/{reviewId}`, volta o item ao
  estado "Avaliar").
- `app/(customer)/__tests__/reviews.page.test.tsx` (novo — ver seção 2).

**Navegação**:
- `components/layout/UserMenu.tsx:44`: adiciona `{ label: 'Minhas
  Avaliações', href: '/reviews' }` logo após `{ label: 'Meus Pedidos', href:
  '/orders' }`.
