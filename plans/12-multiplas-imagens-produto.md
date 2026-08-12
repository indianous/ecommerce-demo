# Múltiplas imagens por produto (frontend)

## Contexto

Complementa `backend/plans/12-multiplas-imagens-produto.md`. O backend
passa a expor `List<String> imageUrls` (ordenada, posição 0 = imagem
principal/capa) em vez de `imageUrl` singular, com limite de 8
imagens. Decisões confirmadas com o usuário:

- Imagem principal = posição 0 — usada em todo lugar que hoje mostra
  só 1 imagem (card do produto, carrinho).
- Página de detalhe do produto ganha uma galeria, reaproveitando o
  `Carousel` genérico do `base-ds`
  (`organisms/Carousel/Carousel.tsx` — aceita `items: ReactNode[]`,
  com setas/dots/loop). Não é uma solução ideal (não é um componente
  de galeria dedicado, com zoom/thumbnails clicáveis etc.), mas já
  existe e não bloqueia a feature.
- Abrir issue em `indianous/base-ds` pedindo um componente de galeria
  de imagens dedicado (thumbnails clicáveis, imagem principal em
  destaque) para substituir o `Carousel` genérico quando existir —
  mesmo espírito da issue já aberta para multi-select
  (`indianous/base-ds#14`).

`FileUpload` do `base-ds` **já suporta `multiple`** (`multiple?:
boolean`, default `false`) e já devolve `File[]` no `onChange` — o
`ProductForm.tsx` de hoje é quem não usa esse recurso (passa 1 arquivo
só e sobrescreve o campo).

## 1. Problemas encontrados

- `types/index.ts` — `Product.imageUrl?: string` precisa virar
  `imageUrls: string[]`.
- `components/forms/ProductForm.tsx:6-23` —
  `ProductFormState.imageUrl: string`; bloco de upload
  (`ProductForm.tsx` seção "Imagem", por volta da linha 156-178) usa
  `<FileUpload accept="image/*">` **sem** `multiple`, pega só
  `[file]` do array e chama `onFormChange({ imageUrl: url })` — cada
  novo upload sobrescreve o anterior em vez de acumular. Preview usa
  `<img>` HTML puro (não o `Image` do base-ds), mostra só 1
  miniatura.
- `components/product/ProductCard.tsx:40,107` — `product.imageUrl`
  usado tanto para exibir a imagem do card quanto para montar o item
  do carrinho (`addItem({..., imageUrl: product.imageUrl})`).
- `components/product/AddToCartButton.tsx:40` — mesma coisa, monta
  item do carrinho com `product.imageUrl`.
- `app/(public)/catalog/[slug]/page.tsx:104-119` — bloco de imagem da
  página de detalhe é uma única `<Image>` (ou placeholder), sem
  galeria — não existe hoje nenhum componente de carrossel/galeria de
  **imagens do mesmo produto** no projeto (`ProductCarousel.tsx`
  existe mas é carrossel de **produtos relacionados**, componente
  diferente).
- `app/(employee)/dashboard/products/[id]/edit/ProductEditContent.tsx:36`
  — `imageUrl: product.imageUrl ?? ''` ao popular o form de edição.
- `components/cart/CartCardItem.tsx:31,33` — usa `item.imageUrl`
  (campo próprio de `CartItem`, já singular hoje) — **não muda**,
  carrinho continua com uma imagem só (a principal), conforme decisão.
- `app/(employee)/dashboard/products/new/ProductCreateContent.tsx` —
  **não referencia `imageUrl` diretamente** (o body do `POST` espalha
  `...form`, que já vai carregar `imageUrls` automaticamente depois da
  troca no `ProductFormState` — nenhuma mudança extra necessária além
  da troca do tipo do form).

## 2. Testes a incluir/alterar

**`components/forms/__tests__/ProductForm.test.tsx`** (estender)

- `<FileUpload>` de imagem tem `multiple` habilitado — selecionar 2
  arquivos de uma vez dispara upload dos 2 e resulta em
  `form.imageUrls` com as 2 URLs (mock do `fetch('/api/upload/image')`
  retornando URLs diferentes por chamada).
- Selecionar um 3º arquivo depois de já ter 2 **acumula** (não
  sobrescreve) — resultado tem as 3 URLs, na ordem de upload.
- Miniaturas de todas as imagens em `form.imageUrls` aparecem no
  preview, cada uma com botão "Remover".
- Clicar "Remover" numa miniatura tira aquela URL de `form.imageUrls`,
  mantendo a ordem das demais.
- Com 2+ imagens, aparece um botão/ação "Tornar capa" nas miniaturas
  que não são a primeira; clicar reordena `form.imageUrls` pra colocar
  a escolhida no índice 0.
- Miniatura na posição 0 tem indicação visual/textual de "Capa".
- Selecionar um 9º arquivo (excedendo o limite de 8) não deve mandar
  a chamada de upload extra / deve mostrar aviso — replicar o mesmo
  tipo de trava que `maxSize`/limite já tem em outros usos do
  `FileUpload` no projeto, ou validar no `onChange` antes de disparar
  o `fetch`.

**`components/product/__tests__/ProductCard.test.tsx`** (estender,
ajustar mocks)

- Mock de `Product` passa a ter `imageUrls: string[]` em vez de
  `imageUrl`.
- Card exibe a primeira imagem (`imageUrls[0]`).
- Adicionar ao carrinho usa `imageUrls[0]` como `imageUrl` do
  `CartItem`.
- Produto sem nenhuma imagem (`imageUrls: []`) cai no placeholder,
  mesmo comportamento de hoje para `imageUrl` ausente.

**`components/product/__tests__/AddToCartButton.test.tsx`** (estender)

- Mesma troca de mock; adicionar ao carrinho usa `imageUrls[0]`.

**`app/(employee)/__tests__/products.edit.page.test.tsx`** (estender)

- Ao carregar o form de edição, `imageUrls` do produto populam o
  form corretamente (substituindo o teste que hoje cobre `imageUrl`
  singular, se existir).

**`app/(public)/__tests__/catalog.product-detail.page.test.tsx`**
(estender)

- Produto com 2+ imagens renderiza o `Carousel` (via
  `role="region" aria-label="Carousel"`, já exposto pelo componente do
  base-ds) com uma slide por imagem.
- Produto com 1 imagem só: `Carousel`/galeria ainda funciona (não
  precisa ter mais de 1 imagem pra renderizar).
- Produto sem nenhuma imagem: cai no placeholder atual (`role="img"`
  com o nome do produto), sem tentar renderizar `Carousel` vazio.

**Outros mocks de `Product` em testes existentes** (`home.page.test.tsx`,
`AddToCartButton.test.tsx`, `products.page.test.tsx`,
`products.create.page.test.tsx`, `stock.page.test.tsx` etc. — os
mesmos arquivos que precisaram de ajuste na migração de categorias,
plano 10): trocar `imageUrl` por `imageUrls: []` (ou com valores,
conforme o teste precisar) nos objetos `Product` mockados, para bater
com o novo tipo. Fazer uma varredura por `grep -rn "imageUrl:"` nos
testes antes de considerar a migração completa, já que o campo é
opcional e pode não aparecer em todos os mocks.

## 3. O que entra no projeto

### Tipos

- `types/index.ts`: `Product.imageUrl?: string` →
  `imageUrls: string[]`.

### Componentes novos

- `components/product/ProductImageGallery.tsx` (novo, mesmo padrão de
  `ProductCarousel.tsx` — componente do projeto que embrulha o
  `Carousel` do `base-ds`):
  ```tsx
  import { Carousel, Image } from 'base-ds'

  interface Props {
    imageUrls: string[]
    productName: string
  }

  export function ProductImageGallery({ imageUrls, productName }: Props) {
    if (imageUrls.length === 0) {
      return (
        <div
          role="img"
          aria-label={productName}
          className="flex aspect-[3/4] items-center justify-center rounded bg-muted text-muted-foreground"
        />
      )
    }

    return (
      <Carousel
        items={imageUrls.map((url, i) => (
          <Image
            key={url}
            src={url}
            alt={`${productName} — imagem ${i + 1}`}
            aspectRatio="portrait"
            objectFit="contain"
            className="rounded"
          />
        ))}
      />
    )
  }
  ```

### Componentes existentes

- `components/forms/ProductForm.tsx`:
  - `ProductFormState.imageUrl: string` → `imageUrls: string[]`
    (`EMPTY_PRODUCT_FORM.imageUrls = []`).
  - `<FileUpload accept="image/*" multiple>` — `onChange` passa a
    receber `File[]`, itera fazendo upload de cada um (mesma chamada
    `POST /api/upload/image` de hoje, uma vez por arquivo) e
    **acrescenta** as URLs resultantes a `form.imageUrls` (em vez de
    sobrescrever); validar limite de 8 antes de disparar os uploads
    (cortar excedente ou avisar via toast/mensagem inline — decisão de
    UX simples, sem precisar de componente novo).
  - Preview: troca o `<img>` único por uma lista de miniaturas (uma
    por `imageUrls[i]`, usando `Image` do base-ds), cada uma com:
    botão "Remover" (tira da lista) e, se não for a posição 0, botão
    "Tornar capa" (reordena pra frente) — mesmo espírito do seletor de
    "categoria principal" já implementado no plano 10, mas como ação
    inline por miniatura em vez de um `<Select>` separado (aqui não há
    uma lista fixa de opções pré-existente, as imagens vão sendo
    adicionadas dinamicamente).
- `components/product/ProductCard.tsx`: `product.imageUrl` (linhas 40
  e 107) → `product.imageUrls[0]` nos dois usos (exibição do card e
  `imageUrl` do `CartItem` ao adicionar ao carrinho).
- `components/product/AddToCartButton.tsx:40`: mesma troca.
- `app/(public)/catalog/[slug]/page.tsx`: bloco de imagem (linhas
  104-119) substituído por
  `<ProductImageGallery imageUrls={product.imageUrls} productName={product.name} />`.
- `app/(employee)/dashboard/products/[id]/edit/ProductEditContent.tsx:36`:
  `imageUrl: product.imageUrl ?? ''` → `imageUrls: product.imageUrls ?? []`.

### base-ds

- Abrir issue em `indianous/base-ds` pedindo um componente de galeria
  de imagens dedicado (thumbnails clicáveis abaixo/ao lado da imagem
  principal, indicador de posição, talvez zoom) — o `Carousel`
  genérico usado agora é aceitável para a v1, mas não foi desenhado
  especificamente para esse caso de uso (ex.: não tem miniaturas
  clicáveis, só setas/dots).

Fora de escopo: reordenar imagens por drag-and-drop (o "Tornar capa"
inline já resolve o caso de uso essencial — trocar a principal — sem
precisar de biblioteca de drag-and-drop), edição/crop de imagem no
próprio formulário, mudança em `CartItem`/carrinho (continua com uma
imagem só, a principal).
