# 63 — Pedidos manuais (feitos pela equipe) — frontend

Plano irmão: `backend/plans/63-pedidos-manuais.md`. Ele cria
`/admin/manual-orders/*`, o filtro por origem e os campos novos do pedido, e
registra as decisões da primeira versão. Este lado depende dele para funcionar
de ponta a ponta. Os testes daqui usam MSW e podem ser escritos antes.

## Contexto

O painel só acompanha pedidos que o cliente fez no site. Este plano cria a tela
**Novo pedido** no grupo **Vendas**, para a equipe registrar vendas feitas por
WhatsApp, telefone ou no balcão, e marca esses pedidos na listagem.

Resumo das decisões (detalhes no plano do backend): preço sempre o efetivo, sem
desconto manual; todo pedido tem cliente, com cadastro rápido (e-mail
obrigatório); entrega com frete cotado ou retirada; "Pagamento já recebido"
(exige `MANAGE_PAYMENTS`) ou "Cobrar do cliente" (gateway ativo, com link de
pagamento quando houver); nova permissão `CREATE_ORDERS`.

### Contrato da API (definido no plano do backend)

| Método e rota | Corpo / query | Resposta |
| --- | --- | --- |
| `GET /admin/manual-orders/customers` | `?search` | `[{ id, name, email, phone, cpf }]` |
| `POST /admin/manual-orders/customers` | `{ name, email, phone?, cpf? }` | `201` · `409` e-mail já cadastrado (com o `id` do existente) |
| `GET /admin/manual-orders/customers/{id}/addresses` | — | `[Address]` |
| `POST /admin/manual-orders/customers/{id}/addresses` | `AddressRequest` | `201 Address` |
| `POST /admin/manual-orders/shipping-quote` | `{ customerId, addressId, items }` | `ShippingQuoteResponse` |
| `POST /admin/manual-orders` | `{ customerId, items, deliveryMethod, addressId?, pickupLocationId?, shippingServiceId?, paymentMethod, paymentReceived, notes? }` | `201` pedido + `checkoutUrl` · `400` · `403` · `409` estoque |
| `GET /admin/orders` | novo `?origin=WEB\|STAFF` | igual a hoje |
| Pedido (admin) | — | novos `origin`, `createdByName` e `notes` |

---

## 1. Problemas encontrados

- **F1** — Não existe tela para criar pedido. `EmployeeOrdersContent` (listagem)
  e `OrderDetailContent` só leem e mudam status.
- **F2** — Não há busca de cliente fora da tela de Clientes (`CustomersContent`,
  que exige `MANAGE_CUSTOMERS`) nem cadastro de cliente ou endereço pelo painel.
- **F3** — A listagem de pedidos não distingue pedidos da equipe, e o detalhe não
  mostra quem criou nem a observação.
- **F4** — `types/index.ts:14`: a união de permissões não tem `CREATE_ORDERS`.
- **F5** — Os componentes do checkout (`CheckoutForm`) leem o carrinho do store e
  o endereço do usuário logado, então não servem direto para o pedido manual. O
  que dá para reaproveitar é a exibição das opções de frete e dos centros de
  retirada; ver o item 7 da seção 3.

---

## 2. Testes a incluir/alterar

### BFF

- `app/api/admin/manual-orders/__tests__/route.test.ts` e os de `customers`,
  `customers/[id]/addresses` e `shipping-quote`: repassam corpo, query e
  `Authorization`, e os status de erro (400, 403, 409) com a mensagem.
- `app/api/admin/orders/__tests__/route.test.ts` (alterar): repassa `origin`.

### `components/forms/__tests__/QuickCustomerForm.test.tsx` (novo)

Tem validação própria.

- Nome e e-mail obrigatórios. E-mail inválido → erro. CPF com dígito verificador
  inválido → erro. Telefone opcional.

### `lib/__tests__/cpf.test.ts` (novo)

- `isValidCpf`, extraído de `lib/pix-key.ts:34` (hoje privado). O
  `pix-key.test.ts` continua passando.

### `components/forms/__tests__/ManualOrderItemsForm.test.tsx` (novo)

Tem validação própria.

- Adicionar produto pela busca, alterar quantidade (`NumberInput`) e remover.
- Quantidade acima do estoque disponível → erro na linha.
- Produto já na lista → soma a quantidade em vez de duplicar a linha.
- Subtotal pelo preço efetivo, com o preço riscado quando em promoção.

### `app/(employee)/dashboard/orders/new/__tests__/ManualOrderContent.test.tsx` (novo)

O fluxo em etapas, com MSW:

1. **Cliente:** buscar → selecionar. "Cadastrar cliente" abre o Dialog com o
   `QuickCustomerForm`; 201 seleciona o novo cliente; 409 mostra "Já cadastrado"
   com o botão "Usar este cliente".
2. **Itens:** busca de produtos pela rota pública do catálogo
   (`/api/catalog/products?search`), adicionar e ajustar. Sem itens, não avança.
   Não usa `/api/admin/products`, porque ela exige `MANAGE_PRODUCTS`
   (`AdminProductController.java:33`) e o funcionário pode ter só
   `CREATE_ORDERS`. A rota pública já devolve só produtos ativos e disponíveis,
   com `stockQuantity` e `effectivePrice`.
3. **Entrega:** "Entrega" lista os endereços do cliente, permite cadastrar um
   (Dialog com o `AddressForm` que já existe) e cota o frete ao escolher endereço;
   "Retirada" lista os centros ativos.
4. **Pagamento:** formas aceitas conforme entrega/retirada (as mesmas regras do
   checkout). O `Switch` "Pagamento já recebido" só aparece com `MANAGE_PAYMENTS`
   ou para admin.
5. **Resumo e observação:** itens, frete e total; `Textarea` com contador de 500.
- "Criar pedido" → `POST /api/admin/manual-orders` com o corpo do contrato →
  toast e redireciona para o detalhe do pedido.
- Com `checkoutUrl` na resposta, o detalhe mostra o link com botão de copiar
  (`CopyButton`, que já existe).
- 409 (estoque) → toast com a mensagem e fica na etapa de itens.
- Sem `CREATE_ORDERS` → `replace('/dashboard')`.

### `app/(admin)/dashboard/admin/orders/new/__tests__/page.test.tsx` (novo)

- A página do admin renderiza o `ManualOrderContent`, com o `Switch` de pagamento visível.

### Listagem e detalhe de pedidos (alterar)

- `OrdersContent.test.tsx`/`EmployeeOrdersContent`: botão "Novo pedido" só com
  `CREATE_ORDERS` (ou admin); filtro "Origem" (Site, Equipe) repassa `origin`;
  `Badge` "Equipe" nas linhas com `origin = STAFF`.
- `OrderDetailContent.test.tsx`: mostra "Criado por <nome>" e a observação quando
  `origin = STAFF`.

### Permissões e menu

- `employee.permissions.page.test.tsx`: lista "Criar pedidos".
- Não entra item novo no menu: "Novo pedido" fica como botão na tela de Pedidos.

---

## 3. O que entra no projeto

### Tipos

1. **`types/index.ts`**: `EmployeePermission` ganha `'CREATE_ORDERS'`;
   `OrderOrigin = 'WEB' | 'STAFF'`; `CustomerLookup`, `QuickCustomerInput`,
   `ManualOrderItemInput { productId; quantity }` e `ManualOrderInput` (o corpo do
   contrato); os tipos de pedido do admin ganham `origin`, `createdByName?` e `notes?`.

### BFF

2. **`app/api/admin/manual-orders/route.ts`** (`POST`),
   **`customers/route.ts`** (`GET`, `POST`),
   **`customers/[id]/addresses/route.ts`** (`GET`, `POST`) e
   **`shipping-quote/route.ts`** (`POST`).
3. **`app/api/admin/orders/route.ts`**: repassar `origin`.

### Componentes

4. **`lib/cpf.ts`** (novo): `isValidCpf` movido de `lib/pix-key.ts`, que passa a
   importar dele. **`components/forms/QuickCustomerForm.tsx`** (novo, puro): nome,
   e-mail, telefone e CPF, com os erros calculados das props.
5. **`components/forms/ManualOrderItemsForm.tsx`** (novo, puro): tabela de itens
   (`Table`) com `NumberInput` de quantidade e remover; a busca de produto vem por
   prop (`SearchField` + resultados controlados pelo pai).
6. **`components/content/dashboard/sales/ManualOrderContent.tsx`** (novo):
   `<Container>` sem `width`, com `PermissionGuard(['CREATE_ORDERS'])`. As etapas
   ficam num só componente com estado, em `Card`s em sequência (Cliente, Itens,
   Entrega, Pagamento, Resumo); cada etapa só abre quando a anterior está
   completa. Usa `authFetch`, `useToast` e `Dialog` para os cadastros rápidos.
7. **Reaproveitamento do checkout:** extrair do `CheckoutForm` a lista de opções
   de frete e a de centros de retirada para
   `components/checkout-shared/ShippingOptionsList.tsx` e
   `PickupLocationList.tsx` (puros), usados pelos dois. O `CheckoutForm` só troca o
   JSX por esses componentes; o teste do checkout é a regressão.
8. **`EmployeeOrdersContent.tsx`**: botão "Novo pedido" (`Button` com ícone
   `Plus`, visível com `CREATE_ORDERS` ou admin), filtro "Origem" e `Badge` "Equipe".
9. **`OrderDetailContent.tsx`**: bloco "Criado por" + observação, e o link de
   pagamento com `CopyButton` quando houver `checkoutUrl`.
10. **Permissões**: rótulo "Criar pedidos" onde as permissões são listadas.

### Páginas

11. **`app/(employee)/dashboard/orders/new/page.tsx`** e
    **`app/(admin)/dashboard/admin/orders/new/page.tsx`**, com `metadata`. As duas
    ficam sob os layouts que já têm o `Suspense` (plano 57), então podem usar
    `useSearchParams` (por exemplo, `?customerId=` vindo do detalhe do cliente).
12. **Atalho opcional:** botão "Novo pedido para este cliente" no
    `CustomerDetailContent`, levando a `…/orders/new?customerId=<id>`.

### Verificação

- `npm test`, `npx tsc --noEmit`, lint dos arquivos tocados e `npm run build`
  (o plano cria rotas novas).
- Com o backend do plano irmão no ar, subir o ambiente completo. O usuário confere:
  - como admin: pedido de balcão com retirada e "Pagamento já recebido", que sai
    pago e confirmado;
  - como funcionário com `CREATE_ORDERS` e sem `MANAGE_PAYMENTS`: pedido com
    entrega para um cliente cadastrado na hora, com endereço novo e frete cotado,
    sem ver o `Switch` de pagamento;
  - o `Badge` "Equipe" e o filtro na listagem, e "Criado por" no detalhe;
  - o checkout do cliente continua funcionando como antes.
