# Carrinho persistido no servidor (frontend)

## Contexto

Par do plano de backend [[24-carrinho-servidor]]. É a mudança de maior
impacto no frontend das 5 fases: `stores/cart.store.ts` deixa de ser dono
do dado e passa a sincronizar com o servidor a cada mutação. `CartDrawer`,
`AddToCartButton` e o checkout (`CheckoutForm`) continuam com a mesma
interface visual — a mudança é toda por baixo, em como o store fala com a
API.

**Decisão confirmada** (ver Contexto do plano de backend): carrinho
anônimo continua 100% local; carrinho de usuário logado passa a ser salvo
no servidor; ao logar com itens no carrinho local, faz merge com o
carrinho do servidor.

## 1. Problemas encontrados

- `stores/cart.store.ts:13-48` — todas as 4 ações (`addItem`, `removeItem`,
  `updateQuantity`, `clearCart`) só mexem no estado local + `localStorage`
  via `persist`; nenhuma chamada de API.
- `components/cart/CartDrawer.tsx`/`CartItem.tsx` (assumindo que existam
  com esse nome, a confirmar na hora de implementar) — leem direto do
  store, então continuam funcionando sem mudança de props se o store
  mantiver a mesma forma pública (`items`, `addItem`, etc.) por baixo.
- `components/product/AddToCartButton.tsx` chama `useCartStore` local —
  vira uma chamada assíncrona (precisa de loading/estado de erro que hoje
  não existe, já que hoje é síncrono e nunca falha).
- Login (`(auth)/login`) não dispara nenhum merge de carrinho hoje — não
  tem carrinho de servidor pra mesclar ainda.
- `app/(employee)/dashboard/customers/[id]/CustomerDetailContent.tsx` não
  tem seção de carrinho atual.

## 2. Testes a incluir/alterar

- Testes que hoje mockam `useCartStore` de forma síncrona (procurar por
  `useCartStore` em `__tests__/` na hora de implementar) precisam passar a
  mockar as chamadas de rede (`msw`) já que as ações viram `async`.
- `stores/__tests__/cart.store.test.ts` (novo, se o store ganhar teste
  próprio pela primeira vez — hoje parece não ter, dado que é só
  Zustand+persist): `addItem` chama `POST /api/cart/items` e só atualiza o
  estado local após sucesso (ou otimista + rollback em falha — decisão de
  implementação a confirmar no code review, mas precisa de teste pro
  caminho de erro de qualquer forma).
- `components/product/__tests__/AddToCartButton.test.tsx` (existente) —
  novo caso: erro de rede mostra toast e não incrementa o contador do
  carrinho.
- Teste do fluxo de login (`(auth)/__tests__/login.page.test.tsx` ou
  equivalente): login com itens no carrinho local dispara
  `POST /api/cart/merge`.
- `app/(employee)/__tests__/customers.detail.page.test.tsx` — novo caso:
  mostra itens do carrinho atual do cliente com quantidade e subtotal;
  carrinho vazio mostra "Carrinho vazio no momento."

## 3. O que entra no projeto

### BFF — novo `app/api/cart/route.ts`, `app/api/cart/items/route.ts`,
`app/api/cart/items/[productId]/route.ts`, `app/api/cart/merge/route.ts`

Proxy 1:1 pros endpoints novos do backend (`GET/POST/PATCH/DELETE`),
mesmo padrão de repasse de `Authorization` que o resto do BFF já usa.

### `stores/cart.store.ts`

- Mantém a mesma forma pública (`items`, `addItem`, `removeItem`,
  `updateQuantity`, `clearCart`, `selectCartTotal`, `selectItemCount`) pra
  não quebrar quem já consome o store — só a implementação interna de cada
  ação passa a chamar o BFF (`fetch` pro `/api/cart/...`) e atualizar
  `items` a partir da resposta do servidor.
- `persist` do `zustand` continua existindo, mas agora é só cache local
  pro carrinho renderizar instantâneo entre navegações — deixa de ser a
  fonte de verdade pro anônimo virar cliente logado.
- Nova função `mergeOnLogin()`, chamada uma vez depois de login/registro
  bem-sucedido (`stores/auth.store.ts` ou o componente de login), que manda
  os `items` locais pro `POST /api/cart/merge` e substitui `items` pelo
  resultado.

### `components/product/AddToCartButton.tsx`

- Ganha estado de loading (mesmo padrão de `isLoading` que `IconButton` já
  suporta, usado em outros botões async do projeto) e trata falha com
  `useToast`.

### `app/(employee)/dashboard/customers/[id]/CustomerDetailContent.tsx`

- Nova seção "Carrinho atual": lista de itens (produto, quantidade,
  subtotal) + total, mesmo padrão visual do resumo do pedido no checkout.

### Fora de escopo

- Não muda o `CheckoutForm` além de continuar montando o pedido a partir
  do carrinho (que agora é o carrinho do servidor, refletido em
  `cart.store.ts` do mesmo jeito) — a tela de checkout não deveria
  precisar mudar visualmente.
