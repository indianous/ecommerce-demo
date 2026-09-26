# 66 — Ajustes pequenos no frontend (em etapas)

Plano para alterações **pequenas e só de frontend**, feitas uma de cada vez.
Novas alterações entram aqui como etapas novas, à medida que forem apresentadas.
Um tópico que não couber nessa dinâmica (precisa de backend, mexe em vários
fluxos ou não dá para verificar sozinho) **não entra neste plano**: vira um plano
próprio.

## Como cada etapa funciona

1. **Claude implementa** a etapa, com TDD, como qualquer plano: testes primeiro,
   depois o código. Rodar `npm test`, `npx tsc --noEmit`, lint dos arquivos
   tocados e `npm run build`. Subir o ambiente completo.
2. **O usuário verifica** no navegador.
3. **Resultado:**
   - **aprovada** → commit só daquela etapa (`feat: … (plano #66, etapa N)`),
     push, e segue para a próxima;
   - **ajustar** → corrige e volta ao passo 2;
   - **descartada** → desfaz as mudanças da etapa (nada foi commitado) e segue
     para a próxima.

Uma etapa não começa antes da anterior estar aprovada ou descartada. Cada etapa
é independente: descartar uma não afeta as outras.

## Situação das etapas

| Etapa | Alteração | Situação |
| --- | --- | --- |
| 1 | Avatar do painel como botão flutuante no canto inferior direito | aprovada |
| 2 | Botão flutuante de WhatsApp na loja | aprovada |
| 3 | Faixa "visão do cliente" com botão para voltar ao painel | aprovada |
| 4 | Loja mostrada como deslogada para a equipe | pendente |
| 5 | Produtos relacionados em grade: 4 por vez, 8 no total | pendente |
| 6 | Tags de categoria sem quebra de linha no texto | pendente |
| 7 | Tags de categoria da página do produto como link | pendente |
| 8 | Layout da pesquisa do catálogo | pendente |
| 9 | Header e footer próprios no login e no cadastro | pendente |

---

## Etapa 1 — Avatar do painel no header

Hoje o menu do usuário (`SidebarAvatar`: avatar + nome, com "Perfil" e "Sair")
fica no **rodapé da sidebar** no desktop e no **topo do drawer** no celular. Ele
passa para um **header no topo direito da área de conteúdo**, igual no desktop e
no celular, nos dois painéis (admin e funcionário).

```
┌────────┬──────────────────────────┐
│ Menu   │  ☰(só celular)  (J) João ▾│  ← header
│        ├──────────────────────────┤
│ Vendas │                          │
│ ...    │   conteúdo               │
└────────┴──────────────────────────┘
```

### 1. Problemas encontrados

- `components/admin/AdminShell.tsx:64` e `components/employee/EmployeeShell.tsx:72`:
  o `SidebarAvatar` vai no `footer` do `Sidebar`, e também em
  `AdminShell.tsx:89`/`EmployeeShell.tsx:97`, no topo do drawer.
- `AdminShell.tsx:70-72` e o bloco equivalente do `EmployeeShell`: o `<header>`
  tem `md:hidden`, então no desktop não existe header para receber o avatar.
- `components/admin/SidebarAvatar.tsx`: o nome e a prop `collapsed` refletem a
  posição antiga. Ele fica em `components/admin/`, mas também é usado pelo
  `EmployeeShell`, e o gatilho diz "Menu do admin" (linha 25) nos dois painéis.

### 2. Testes a incluir/alterar

**`components/layout/__tests__/DashboardUserMenu.test.tsx`** (renomeado de
`components/admin/__tests__/SidebarAvatar.test.tsx`)

- Continuam: inicial do nome no `Avatar`, nome visível, sem o e-mail no gatilho,
  "Perfil" com o `profileHref`, "Sair" chama `logout()` e redireciona para
  `/login`, e sem violações de acessibilidade.
- Sai: "oculta nome com sr-only quando collapsed=true".
- Novo: o nome some abaixo de `sm` (`sr-only sm:not-sr-only`).
- Novo: o gatilho tem `aria-label="Menu do usuário"`.

**`AdminShell.test.tsx` e `EmployeeShell.test.tsx`** (alterar)

- Novo: existe um `banner` (`<header>`) no desktop, com o menu do usuário.
- Novo: o rodapé do `Sidebar` não tem o menu do usuário.
- Novo: o drawer aberto não contém o menu do usuário, e o header continua com ele.
- Novo: o botão "Abrir menu" continua com `md:hidden`.
- Sai: "recolher também esconde o nome no SidebarAvatar" (`AdminShell.test.tsx:163`,
  `EmployeeShell.test.tsx:271`). No lugar: recolher a sidebar não altera o menu
  do usuário no header.
- `__tests__/no-nested-main.test.ts` continua passando.

### 3. O que entra no projeto

1. **`components/layout/DashboardUserMenu.tsx`** (`git mv` de
   `components/admin/SidebarAvatar.tsx`): sem a prop `collapsed`, nome com
   `sr-only sm:not-sr-only`, gatilho com "Menu do usuário".
2. **`AdminShell.tsx`** e **`EmployeeShell.tsx`**: tirar o `footer` do `Sidebar` e
   o avatar do topo do drawer. O `<header>` perde o `md:hidden` e ganha
   `sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 py-3`,
   com o ☰ (que mantém `md:hidden`) à esquerda e o `DashboardUserMenu` com
   `ml-auto` à direita.

### Ajuste 1 — botão flutuante (pedido na verificação)

O avatar no header não ficou como o esperado: ele passa a ser um **botão flutuante
no canto inferior direito** (`fixed bottom-4 right-4 z-30`), igual no desktop e no
celular, com o menu ("Perfil" e "Sair") abrindo **para cima** e alinhado à direita
(`DropdownMenu` com `position="top"` e `align="end"`). Só o avatar aparece, sem o
nome (que fica em `sr-only` e no `title`). O header volta a ser só do celular
(`md:hidden`, com o ☰), como antes da etapa. O `DashboardUserMenu` é renderizado
uma vez no shell, fora da sidebar, do header e do drawer. O drawer aberto (z-50)
fica por cima do botão.

### O que o usuário verifica

- Painel do admin e do funcionário, no desktop e no celular: avatar no topo
  direito, com "Perfil" e "Sair".
- Sidebar sem o avatar no rodapé, e o drawer do celular sem o avatar.
- Recolher a sidebar não mexe no avatar.
- O header continua no topo ao rolar a página.

---

## Etapa 2 — Botão flutuante de WhatsApp na loja

Um botão redondo fixo no **canto inferior direito** das páginas da loja
(públicas e área do cliente), que abre a conversa com a loja. O número é o
telefone de contato do site (`contactPhone`, editado em Site → Contato), que
`GET /api/site/settings` já devolve e que `lib/whatsapp.ts` já transforma em link
`wa.me` (hoje usado em `ManualPaymentInstructions`). Não precisa de backend.

- Não aparece no painel, no login e cadastro, nem no **`/checkout`**, onde
  cobriria o "Finalizar pedido" no celular.
- Some quando o telefone está vazio ou é inválido.
- Abre a conversa sem texto pré-preenchido.
- Ícone: SVG local com `fill="currentColor"`, seguindo os ícones de Instagram,
  TikTok e Facebook que o `AppShell` já desenha (o lucide não tem ícones de marca).
- Cor: `Button` `variant="primary"` do base-ds, sem o verde do WhatsApp literal.

### 1. Problemas encontrados

- `components/layout/AppShell.tsx`: não há botão de contato.
- `contexts/SiteSettingsContext.tsx:57-85`: o contexto já busca
  `/api/site/settings`, mas não expõe `contactPhone`. Usar o `useSiteSettings`
  no `AppShell` faria uma segunda requisição igual em toda página da loja.

### 2. Testes a incluir/alterar

**`contexts/__tests__/SiteSettingsContext.test.tsx`** (alterar)

- `contactPhone` vem das configurações e é exposto. Sem o campo → `null`.

**`components/layout/__tests__/WhatsAppButton.test.tsx`** (novo)

- `contactPhone = "(11) 98765-4321"` → link `https://wa.me/5511987654321`, com
  `target="_blank"`, `rel="noopener noreferrer"` e
  `aria-label="Falar com a loja no WhatsApp"`.
- Telefone vazio ou inválido → não renderiza.
- Em `/checkout` (mock do `usePathname`) → não renderiza.
- Fica num contêiner `fixed` no canto inferior direito.
- Sem violações de acessibilidade.

**`components/layout/__tests__/AppShell.test.tsx`** (alterar)

- O `WhatsAppButton` é renderizado dentro do `AppShell`, fora do `<main>`.

### 3. O que entra no projeto

1. **`contexts/SiteSettingsContext.tsx`**: guarda e expõe `contactPhone` no mesmo
   `useEffect` que já lê as configurações. O `SiteSettings` (`types/index.ts:26`)
   já tem o campo; só o `SiteSettingsContextValue` ganha `contactPhone: string | null`.
2. **`components/layout/WhatsAppButton.tsx`** (novo): lê `contactPhone` do
   contexto, monta o link com `whatsappUrl`, esconde em `/checkout`
   (`usePathname`) e renderiza um contêiner `fixed bottom-4 right-4 z-40` com o
   `Button` do base-ds como link (`as="a"`, `href`, `target`, `rel`, `iconOnly`,
   `variant="primary"`, `aria-label`) e o `WhatsAppIcon`. O `ButtonAsLink` já
   existe no base-ds (`index.d.ts:48-51`).
3. **`WhatsAppIcon`**: SVG local junto dos ícones de rede social do `AppShell`.
4. **`components/layout/AppShell.tsx`**: renderiza o `<WhatsAppButton />` depois do `Footer`.
5. **`.claude/CLAUDE.md`** (repositório da raiz, `indianous/ecommerce`):
   acrescentar `contactPhone` à lista de campos do `SiteSettingsContext`. Commit
   separado nesse repositório, junto com a aprovação da etapa.

### Notas da implementação

- O `WhatsAppIcon` ficou dentro de `WhatsAppButton.tsx`, e não junto dos ícones do `AppShell`: o `AppShell`
  importa o botão, e exportar o ícone de lá criaria um import circular.
- O `.claude/CLAUDE.md` da raiz está no `.gitignore` do repositório `indianous/ecommerce`, então a
  atualização do `contactPhone` ficou só local (não há commit a fazer).
- A página 404 também usa o `AppShell`: o mock de `next/navigation` do teste dela ganhou `usePathname`.

### O que o usuário verifica

- Botão no canto inferior direito da home, do catálogo, de um produto, do
  carrinho e dos pedidos.
- Ausente no checkout, no login e no painel.
- Abre a conversa com o número de Site → Contato.
- Apagar o telefone em Site → Contato: o botão some.
- No celular, o botão não cobre nada importante nas páginas acima.

---

## Etapa 3 — Faixa "visão do cliente" para a equipe

Quando um admin ou funcionário logado abre a loja, aparece uma faixa no topo,
acima da navbar: **"Você está vendo a loja como um cliente"** + o botão **"Voltar
ao painel"**, que leva para `/dashboard/admin` (admin) ou `/dashboard`
(funcionário). A faixa não fecha e aparece em todas as páginas que usam o
`AppShell`. Para cliente e visitante, nada muda.

```
┌───────────────────────────────────────────────────────────────┐
│ 👁 Você está vendo a loja como um cliente  [Voltar ao painel] │ ← faixa
├───────────────────────────────────────────────────────────────┤
│ Navbar                                                        │
├───────────────────────────────────────────────────────────────┤
│   página da loja                                              │
└───────────────────────────────────────────────────────────────┘
```

Esta etapa é independente da 4, mas as duas se completam: com a 4 aprovada, a
faixa passa a ser o único sinal de que a pessoa está logada como equipe.

### 1. Problemas encontrados

- `components/layout/AppShell.tsx`: não diferencia quem é da equipe. O único
  caminho de volta ao painel é o item "Painel" dentro do `UserMenu`
  (`UserMenu.tsx:31`), escondido no dropdown.
- A faixa usa o `Alert` do base-ds, criado a pedido deste plano
  ([indianous/base-ds#45](https://github.com/indianous/base-ds/issues/45), na
  v0.4.2, já instalada): `layout="full"`, `variant="neutral"`, `icon` e `actions`.

### 2. Testes a incluir/alterar

**`components/layout/__tests__/StaffPreviewBanner.test.tsx`** (novo)

- Role `ADMIN` → faixa com "Você está vendo a loja como um cliente" e o botão
  "Voltar ao painel" apontando para `/dashboard/admin`.
- Role `EMPLOYEE` → o botão aponta para `/dashboard`.
- `CUSTOMER`, visitante e antes da hidratação da sessão (role nulo) → não renderiza.
- A faixa é uma `region` com `aria-label="Visão do cliente"` (o `Alert` aceita
  `role` e `aria-label` no lugar do `role="status"` padrão da variante `neutral`).
- Sem violações de acessibilidade.

**`components/layout/__tests__/AppShell.test.tsx`** (alterar)

- A faixa vem antes da navbar e fora do `<main>`.

### 3. O que entra no projeto

1. **`components/layout/StaffPreviewBanner.tsx`** (novo): lê o `role` do
   `useAuthStore`; para `ADMIN`/`EMPLOYEE`, renderiza
   `<Alert variant="neutral" layout="full" icon={<Icon name="Eye" />} role="region" aria-label="Visão do cliente" actions={<Button as="a" href={homeFor(role)} variant="outline" size="sm">Voltar ao painel</Button>}>`
   com o texto "Você está vendo a loja como um cliente". O `homeFor` vem de
   `lib/route-access.ts` (plano 59).
2. **`AppShell.tsx`**: renderiza o `<StaffPreviewBanner />` antes do `Navbar`.

### O que o usuário verifica

- Logado como admin: a faixa aparece na home, no catálogo, num produto e no
  checkout; "Voltar ao painel" leva para `/dashboard/admin` sem pedir login.
- Logado como funcionário: o botão leva para `/dashboard`.
- Logado como cliente ou deslogado: a faixa não aparece.
- No celular, o texto e o botão quebram de linha sem cortar.

---

## Etapa 4 — Loja mostrada como deslogada para a equipe

Para admin e funcionário, a loja se comporta **como para um visitante**: a
navbar mostra "Entrar" em vez do menu do usuário, sem o sino de notificações;
favoritos pedem login; o carrinho fica no navegador (como o do visitante), não no
servidor; e o checkout mostra a tela de entrar/cadastrar. A sessão da equipe
continua existindo por baixo, então o "Voltar ao painel" da etapa 3 funciona sem
pedir login.

**Aviso sobre o "Entrar" e o checkout:** se alguém da equipe entrar pela loja com
uma conta de cliente, essa sessão substitui a da equipe, como aconteceria com
qualquer login. Fica registrado aqui para a verificação.

### 1. Problemas encontrados

Cada componente da loja lê a sessão direto do `useAuthStore`, e a sessão da
equipe conta como "logado":

- `components/layout/UserMenu.tsx:9,17,31`: mostra o menu do usuário (com o link
  "Painel") em vez de "Entrar".
- `components/layout/NotificationBell.tsx:14`: mostra o sino.
- `components/product/WishlistButton.tsx:14`: favorita pela conta da equipe.
- `components/product/ShippingPreview.tsx:25` e
  `components/product/ProductViewTracker.tsx:12`: mandam o token da equipe.
- `stores/cart.store.ts:52,74,83`: com sessão, o carrinho vai para o servidor
  (conta da equipe); sem sessão, fica no navegador.
- `components/content/store/CheckoutContent.tsx:12` e
  `components/forms/CheckoutForm.tsx:28`: seguem para o checkout logado.

As rotas só de cliente (`/cart`, `/orders`, `/profile`, `/reviews`) já mandam a
equipe para `/` pelo `proxy.ts`, e isso continua igual.

### 2. Testes a incluir/alterar

**`stores/__tests__/storefront-session.test.ts`** (novo)

- `selectStorefrontSession(state)` e o hook `useStorefrontSession()`: para
  `CUSTOMER`, devolvem `isAuthenticated`, `accessToken` e `user` do store; para
  `ADMIN`/`EMPLOYEE`, devolvem `{ isAuthenticated: false, accessToken: null, user: null }`;
  para visitante, o mesmo que hoje.

**Componentes (um caso novo em cada teste existente)**

- `UserMenu`: com role `ADMIN` ou `EMPLOYEE` → mostra "Entrar", sem o menu.
- `NotificationBell`: equipe → não renderiza.
- `WishlistButton`: equipe → mesmo comportamento do visitante (pede login). Esse
  componente não tem teste hoje, então ganha `components/product/__tests__/WishlistButton.test.tsx`,
  com o caso de visitante, o de cliente e o de equipe.
- `ShippingPreview` e `ProductViewTracker`: equipe → não mandam `Authorization`.
- `cart.store`: equipe → `addItem`, `removeItem` e `updateQuantity` ficam locais
  (nenhuma chamada a `/api/cart`).
- `checkout.page.test.tsx`: equipe → mostra o `CheckoutAuth`, como visitante.
- Os casos de cliente e visitante continuam iguais (regressão).

### 3. O que entra no projeto

1. **`stores/storefront-session.ts`** (novo): `selectStorefrontSession(state)` e o
   hook `useStorefrontSession()`, que escondem a sessão quando o `role` não é
   `CUSTOMER`. Um lugar só para a regra "a loja trata a equipe como visitante".
2. Trocar `useAuthStore` pelo `useStorefrontSession` nos componentes da loja
   listados em "Problemas" (`UserMenu`, `NotificationBell`, `WishlistButton`,
   `ShippingPreview`, `ProductViewTracker`, `CheckoutContent`, `CheckoutForm`), e
   `useAuthStore.getState()` pelo seletor no `cart.store`.
3. **`UserMenu.tsx`**: remover o item "Painel" (linha 31), que fica sem uso: a
   volta ao painel passa a ser a faixa da etapa 3. Se a etapa 3 tiver sido
   descartada, o item fica, porque seria o único caminho de volta.
4. O painel, o `AuthHydrator`, o `authFetch` e o login **não mudam**: continuam
   usando a sessão real.

### O que o usuário verifica

- Logado como admin ou funcionário, na loja: navbar com "Entrar" e sem o sino;
  favoritar pede login; adicionar ao carrinho funciona e fica só no navegador; o
  checkout mostra a tela de entrar/cadastrar.
- "Voltar ao painel" (etapa 3) leva ao painel ainda logado.
- Logado como cliente: tudo igual a antes (menu, sino, favoritos, carrinho e checkout).
- Deslogado: tudo igual a antes.

---

## Etapa 5 — Produtos relacionados em grade

Hoje a página do produto mostra os relacionados num `Carousel` do base-ds com
**um card por vez**, ocupando a largura inteira (por isso fica grande demais). Passa
a mostrar **4 cards por vez, em grade**, com **8 no total em duas páginas**,
navegadas pelas setas e pelos pontos do próprio `Carousel`.

```
Produtos relacionados                        ‹  ›
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ card │ │ card │ │ card │ │ card │      página 1 de 2
└──────┘ └──────┘ └──────┘ └──────┘
                ● ○
```

- Desktop (`md` para cima): 4 colunas. Celular: 2 colunas (2×2), ainda 4 por página.
- Com 4 relacionados ou menos, uma página só, sem setas nem pontos.
- Com 5 a 7, a segunda página fica incompleta, alinhada à esquerda.

### 1. Problemas encontrados

- `components/product/ProductCarousel.tsx:18`: passa um `ProductCard` por item ao
  `Carousel`, que mostra um item por vez (`CarouselProps` só tem `items`,
  `showArrows`, `showDots`, `loop` e `className`; não há "itens por vez").
- `app/(public)/catalog/[slug]/page.tsx:58`: pede `?limit=6`. O backend aceita
  qualquer `limit` (`CatalogController.java:68`) e completa com outras categorias
  quando faltam relacionados, então basta pedir 8.

### 2. Testes a incluir/alterar

**`components/product/__tests__/ProductCarousel.test.tsx`** (novo; o componente não tem teste hoje)

- Com 8 produtos → 2 páginas, com 4 cards cada.
- Com 3 produtos → 1 página, sem setas e sem pontos.
- Com 6 produtos → 2 páginas (4 + 2).
- Cada página é uma grade com 2 colunas no celular e 4 a partir de `md`.
- Sem produtos → não renderiza (como hoje).

**`app/(public)/__tests__/catalog.product-detail.page.test.tsx`** (alterar): pede
`/related?limit=8`.

### 3. O que entra no projeto

1. **`ProductCarousel.tsx`**: agrupa os produtos de 4 em 4 (`chunk(products, 4)`)
   e passa cada grupo como um item do `Carousel`, renderizado como
   `<div className="grid grid-cols-2 gap-4 md:grid-cols-4">`. `showArrows` e
   `showDots` só quando há mais de uma página.
2. **`app/(public)/catalog/[slug]/page.tsx`**: `limit=8`.

### O que o usuário verifica

- Página de um produto: 4 relacionados lado a lado, setas e pontos para a segunda
  página com mais 4.
- Os cards têm o tamanho de um card do catálogo, não a largura inteira.
- No celular: 2×2 por página.
- Um produto com poucos relacionados: uma página só, sem setas.

---

## Etapa 6 — Tags de categoria sem quebra de linha no texto

O texto de uma tag de categoria ("Casa e Jardim") não pode quebrar dentro do
próprio badge. Se não couber na linha, a tag inteira desce, sem se partir.

### 1. Problemas encontrados

- O texto da tag já não quebra dentro do `Badge`: o base-ds incluiu
  `whitespace-nowrap` na classe base
  ([indianous/base-ds#46](https://github.com/indianous/base-ds/issues/46), na
  v0.4.1, já instalada). Falta só o contêiner.
- `app/(public)/catalog/[slug]/page.tsx:113` e `components/product/ProductCard.tsx:59`:
  as tags ficam num `flex` sem `flex-wrap`. Com o texto sem quebra, várias tags
  longas precisam poder descer para a linha de baixo inteiras.

### 2. Testes a incluir/alterar

- **`components/product/__tests__/ProductCard.test.tsx`** e
  **`app/(public)/__tests__/catalog.product-detail.page.test.tsx`** (alterar): o
  contêiner das tags tem `flex-wrap`.

### 3. O que entra no projeto

1. `flex-wrap` nos contêineres das tags da página do produto e do `ProductCard`.
   Nenhuma classe local no `Badge` (o base-ds já resolve).

### O que o usuário verifica

- Um produto com categoria de nome longo: a tag fica numa linha só, na página
  do produto e no card do catálogo.
- Um produto com várias categorias: as tags descem inteiras para a linha de
  baixo, sem se partir.
- Efeito colateral avisado no CHANGELOG da v0.4.1: os chips do `MultiSelect`
  (categorias no formulário do produto) também não quebram mais; conferir que um
  nome longo não estoura o campo.

---

## Etapa 7 — Tags de categoria da página do produto como link

Na **página do produto**, cada tag de categoria ao lado do nome passa a ser um
link para o catálogo filtrado por ela (`/catalog?category=<slug>`). O card de
produto não muda.

### 1. Problemas encontrados

- `app/(public)/catalog/[slug]/page.tsx:113-117`: as tags são só `Badge`, sem
  link. Hoje a única forma de ir para a categoria é a breadcrumb, e só para a
  primeira categoria (`linha 102`).
- `BadgeProps` não tem `href` nem `asChild`, então o link envolve o `Badge`.

### 2. Testes a incluir/alterar

**`app/(public)/__tests__/catalog.product-detail.page.test.tsx`** (alterar)

- Cada categoria é um link com o nome da categoria e `href`
  `/catalog?category=<slug>`, construído com o `buildCatalogUrl`.
- O badge "Promoção" continua sem link.

### 3. O que entra no projeto

1. **`app/(public)/catalog/[slug]/page.tsx`**: cada `Badge` de categoria dentro de
   um `<Link href={buildCatalogUrl({ category: c.slug })}>` do Next, com
   `className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
   (anel de foco com os tokens) e `hover:opacity-80` para indicar que é clicável.

### O que o usuário verifica

- Na página de um produto, clicar numa tag leva ao catálogo filtrado por aquela
  categoria.
- Com mais de uma categoria, cada tag leva à sua.
- O cursor e o hover indicam que a tag é clicável, e dá para chegar nela pelo Tab.

---

## Etapa 8 — Layout da pesquisa do catálogo

**Proposta** de layout para o topo do catálogo (título, busca, ordenação e
filtro por categoria). Se não for o que se espera, ajusta-se na verificação.

```
Catálogo
12 produtos · resultados para "camisa"            (linha de apoio)

┌───────────────────────────────────┬─────┐   Ordenar por [Nome (A-Z) ▾]
│ Buscar produtos...                │  🔍 │
└───────────────────────────────────┴─────┘

(Todos) (Camisetas) (Calças) (Acessórios)     ← categoria atual destacada
```

- Busca ocupando o espaço disponível à esquerda (até `max-w-xl`) e a ordenação à
  direita, na mesma linha a partir de `sm`, alinhadas pela base. No celular,
  uma embaixo da outra, as duas com largura total.
- "Ordenar por" como rótulo visível do `Select` (hoje é só `aria-label`).
- Linha de apoio com a quantidade de produtos e o termo buscado.
- Filtro de categorias: a categoria atual destacada, e "Todos" mantém a busca e
  a ordenação (hoje zera as duas).
- O campo de busca mostra o termo atual quando a busca muda por outro caminho
  (a busca da navbar, por exemplo).

### 1. Problemas encontrados

- `app/(public)/catalog/page.tsx:62`: título com `<h1>` nativo e classes
  próprias (`mb-6 text-2xl font-bold`) em vez do `Heading` do base-ds.
- `page.tsx:64-67`: a linha usa `sm:justify-between` sem dar largura à busca, então
  o `SearchField` e o `Select` ficam do tamanho do conteúdo, desalinhados.
- `page.tsx:70-83`: os filtros de categoria usam cores literais
  (`hover:bg-gray-100`) em vez de tokens, não destacam a categoria atual, e o
  "Todos" (`href="/catalog"`) descarta `search` e `sort`.
- `components/catalog/CatalogSearch.tsx:22`: `SearchField` com `defaultValue`
  (não controlado). Quando a busca muda sem remontar a página (busca pela
  navbar estando no catálogo), o campo continua com o termo antigo.
- `components/catalog/CatalogSort.tsx:31`: sem rótulo visível.
- Sem indicação de quantos resultados a busca trouxe.

### 2. Testes a incluir/alterar

**`app/(public)/__tests__/catalog.page.test.tsx`** (alterar)

- Título é um `heading` de nível 1 "Catálogo" (base-ds).
- Linha de apoio: "12 produtos"; com busca, "12 produtos · resultados para
  "camisa""; com 1, "1 produto".
- A categoria atual tem `aria-current="page"`; as outras não.
- "Todos" preserva `search` e `sort` na URL.

**`components/catalog/__tests__/CatalogSearch.test.tsx`** (alterar)

- Remonta com o termo novo quando a prop `defaultValue` muda (o campo mostra o
  termo novo).

**`components/catalog/__tests__/CatalogSort.test.tsx`** (alterar)

- Tem o rótulo visível "Ordenar por", associado ao `Select`.

### 3. O que entra no projeto

1. **`app/(public)/catalog/page.tsx`**: `Heading as="h1"`, linha de apoio com
   `Text color="muted"`, a linha de busca com
   `flex flex-col gap-4 sm:flex-row sm:items-end` (busca em
   `flex-1 sm:max-w-xl`, ordenação com `sm:ml-auto`), e os filtros de categoria
   com tokens (`border-border`, `hover:bg-muted`, atual com
   `bg-primary text-primary-foreground` e `aria-current="page"`). "Todos" usa
   `buildCatalogUrl({ search, sort })`.
2. **`CatalogSearch`**: `key={defaultValue}` no `SearchField` (ou no próprio
   `CatalogSearch`, na página) para remontar quando o termo muda.
3. **`CatalogSort`**: o `Select` do base-ds não tem prop `label`
   (`SelectProps` estende os atributos de `<select>`), então ele fica dentro de um
   `FormField` do base-ds com `label="Ordenar por"` e `id="catalog-sort"`, e o
   `aria-label` sai.

### O que o usuário verifica

- O topo do catálogo no desktop e no celular: busca e ordenação alinhadas, título
  e contagem.
- Buscar pela caixa do catálogo e pela navbar: o campo mostra o termo atual e a
  contagem bate.
- Filtrar por categoria: a atual fica destacada; "Todos" mantém a busca.
- Se o layout proposto não for o esperado, dizer o que mudar (esta etapa foi
  escrita como proposta).

---

## Etapa 9 — Header e footer próprios no login e no cadastro

Hoje `/login` e `/register` (e as páginas de autenticação que vierem, como as do
plano 64) não têm nenhuma navegação: não dá para voltar à loja sem editar a URL.
Passam a ter um **header e um footer mínimos, diferentes dos da loja**:

```
┌────────────────────────────────────────────────┐
│ [logo]                         ← Voltar à loja │ ← header
├────────────────────────────────────────────────┤
│                                                │
│              Entrar / Cadastro                 │
│                                                │
├────────────────────────────────────────────────┤
│ © 2026 Loja · Privacidade · Termos             │ ← footer
└────────────────────────────────────────────────┘
```

- Header: o logo da loja (do `SiteSettingsContext`, com o texto "Loja" como
  fallback, como no `AppShell`), com link para `/`, e à direita o link
  "Voltar à loja". Sem menu, busca, carrinho, sino nem menu do usuário.
- Footer: uma linha com o copyright e os links de política de privacidade e
  termos. Sem as colunas nem as redes sociais do footer da loja.

### 1. Problemas encontrados

- `app/(auth)/layout.tsx`: só um `<main>` com o `Suspense`, sem header nem footer.

### 2. Testes a incluir/alterar

**`app/(auth)/__tests__/layout.test.tsx`** (alterar)

- Tem um `banner` (header) com um link para `/` com o logo (ou "Loja") e o link
  "Voltar à loja" para `/`.
- Tem um `contentinfo` (footer) com o copyright e os links para
  `/privacy-policy` e `/terms-and-conditions`.
- Não tem a busca, o carrinho nem o menu do usuário.
- O `<main>` continua sendo do layout, e o `Suspense` continua em volta do
  `children` (`no-nested-main.test.ts` continua passando).

### 3. O que entra no projeto

1. **`components/layout/AuthShell.tsx`** (novo): header e footer mínimos, com os
   componentes do base-ds (todas as props do `Navbar` e do `Footer` são opcionais
   no `index.d.ts`):
   - `Navbar` só com `logo` (o mesmo `Link` + `Image` do `AppShell`) e
     `actions={[<Button as="a" href="/" variant="ghost" leftIcon={<Icon name="ArrowLeft" />}>Voltar à loja</Button>]}`,
     sem `items`, `search` e `sticky`;
   - `Footer` só com `copyright` e uma coluna `{ title: 'Informações', links: [Privacidade, Termos] }`,
     sem `socialLinks`.
   O logo e o `Link` do logo podem sair do `AppShell` para um `StoreLogo`
   compartilhado, para os dois não divergirem.
2. **`app/(auth)/layout.tsx`**: envolve o `<main>` com o `AuthShell` (header acima,
   footer abaixo), mantendo o `Suspense` e o `<main>` no layout.

### O que o usuário verifica

- `/login` e `/register`: o header com o logo e "Voltar à loja", e o footer mínimo.
- O logo e o "Voltar à loja" levam à home.
- Os links do footer abrem as páginas de privacidade e de termos.
- No celular, o header e o footer não empurram o formulário para fora da tela.
