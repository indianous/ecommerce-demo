# 43 — Integração com Melhor Envio (frontend)

Plano irmão: `backend/plans/43-integracao-melhor-envio.md` (contexto completo,
decisões de escopo/cobrança/autenticação, e o desenho do backend — este
arquivo cobre só o frontend).

## Estado atual

- `CheckoutForm.tsx` (`components/forms/CheckoutForm.tsx`) não tem nenhuma
  etapa de frete: só `Select` de endereço + `Radio` de forma de pagamento +
  total (soma do carrinho, `useCartStore(selectCartTotal)`) + botão de
  finalizar.
- `ProductForm.tsx` já tem uma seção de dados fiscais (NCM/CFOP/unidade
  comercial/GTIN/origem, `components/forms/ProductForm.tsx:255-310`) — os
  novos campos de envio (peso/dimensões/frete grátis) entram como uma seção
  irmã dessa.
- `ShippingContent.tsx` (`components/content/ShippingContent.tsx`) e
  `OrderDetailContent.tsx` (`components/content/OrderDetailContent.tsx`) hoje
  não têm nenhuma ação de etiqueta/rastreio — só listam/detalham o pedido.
- `types/index.ts`: `Product` não tem peso/dimensões/frete grátis;
  `AdminOrderResponse`/`AdminOrderDetailResponse`/`OrderResponse` não têm
  nenhum campo de frete.

## 1. Problemas encontrados

- Nenhuma tela hoje sabe pedir cotação de frete, mostrar opções, ou lidar com
  o total incluindo frete — tudo isso é novo.
- `ProductForm.tsx` não valida/expõe peso e dimensões — sem isso, o checkout
  vai bloquear com "dados de envio pendentes" pra qualquer produto (regra do
  backend, ver plano irmão seção 2).
- `ShippingContent.tsx`/`OrderDetailContent.tsx` não têm onde mostrar código
  de rastreio nem link de etiqueta, nem botão pra comprar a etiqueta.

## 2. Testes a incluir/alterar (agrupados por arquivo)

- **`ProductForm.test.tsx`** (ou o teste de página que cobre o form, seguir o
  padrão já usado pros campos fiscais): novos campos peso/altura/largura/
  comprimento renderizam e são enviados no payload de salvar; checkbox
  "Frete grátis" alterna `freeShipping` no payload.
- **`CheckoutForm.test.tsx`** (novo, ou seção nova no teste existente de
  checkout):
  - ao escolher um endereço, dispara a chamada de cotação (`/api/shipping/calculate`)
    e mostra as opções retornadas (transportadora, prazo, preço).
  - escolher uma opção atualiza o total exibido (produtos + frete).
  - botão "Finalizar Pedido" fica desabilitado até uma opção de frete ser
    escolhida (quando a cotação não é toda frete-grátis).
  - carrinho 100% frete grátis: não mostra seleção de opções, mostra "Frete
    grátis" e não bloqueia o submit por causa disso.
  - erro da cotação (400, produto com dado de envio incompleto) mostra a
    mensagem de erro em vez de travar a tela.
  - `handleSubmit` manda `shippingServiceId` no `POST /api/orders` junto com
    `addressId`/`paymentMethod`.
- **`ShippingContent.test.tsx`**: botão "Comprar etiqueta" (novo, por linha
  da tabela) chama o endpoint admin e, depois de sucesso, a linha passa a
  mostrar o código de rastreio.
- **`OrderDetailContent.test.tsx`**: seção de frete no detalhe do pedido
  mostra transportadora/serviço/custo quando presentes; botão "Comprar
  etiqueta" (mesmo padrão do "Emitir NF-e" já existente) some depois de
  comprada e mostra código de rastreio + link do PDF.

## 3. O que entra no projeto

### Tipos (`types/index.ts`)
- `Product`: `weight?`, `height?`, `width?`, `length?` (number), `freeShipping: boolean`.
- Novo `ShippingQuote`: `{ serviceId: string; carrierName: string; serviceName: string; price: number; deliveryDays: number }`.
- Novo `ShippingQuoteResponse`: `{ options: ShippingQuote[]; freeShipping: boolean }`.
- `AdminOrderResponse`/`AdminOrderDetailResponse`/`OrderResponse`: `shippingCost?`,
  `shippingCarrierName?`, `shippingServiceName?`, `trackingCode?`, `shippingLabelUrl?`.

### BFF
- Novo `app/api/shipping/calculate/route.ts` (`POST`, proxy pro backend
  `/api/v1/shipping/calculate`, repassando `Authorization`).
- Novo `app/api/admin/orders/[id]/shipping-label/route.ts` (`POST`, proxy pro
  backend `/api/v1/admin/orders/{id}/shipping-label`).

### Componentes
- **`ProductForm.tsx`**: nova seção "Envio" (ao lado da seção fiscal) — peso
  (kg), altura/largura/comprimento (cm), `Checkbox` "Frete grátis".
- **`CheckoutForm.tsx`**: ao escolher/trocar o endereço, chama
  `/api/shipping/calculate` com `addressId` (o backend pega os itens do
  carrinho pelo usuário logado); mostra as opções como `Radio` (transportadora
  + prazo + preço) ou, se `freeShipping: true` na resposta, mostra "Frete
  grátis" sem opções pra escolher; total exibido passa a ser produtos + frete
  escolhido; `handleSubmit` inclui `shippingServiceId` (omitido se frete
  grátis).
- **`ShippingContent.tsx`**: nova coluna/ação "Comprar etiqueta" — chama o
  BFF novo, mostra código de rastreio depois de comprada (desabilita o botão
  se já tiver `trackingCode`).
- **`OrderDetailContent.tsx`**: nova seção "Frete" (ao lado da seção de nota
  fiscal já existente) — transportadora, serviço, custo; botão "Comprar
  etiqueta" quando ainda não tem `trackingCode`; código de rastreio + link do
  PDF quando já tem.

### `base-ds`
Nenhum componente novo necessário — `Radio`/`Checkbox`/`FormField`/`Button`
já cobrem tudo isso.
