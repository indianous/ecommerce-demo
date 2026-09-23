# 62 — Cupons de desconto — frontend

Plano irmão: `backend/plans/62-cupons-de-desconto.md`. Ele cria as tabelas, a
API de cupons, a validação no carrinho e o desconto no pedido, e registra as
decisões da primeira versão (tipos, alcance, limites, cancelamento). Este lado
depende dele para funcionar de ponta a ponta. Os testes daqui usam MSW e podem
ser escritos antes. É independente do plano 61 (promoções).

## Contexto

Não há cupom em nenhuma parte do sistema. Este plano cria a tela **Cupons** no
grupo **Vendas** do painel, o campo de cupom no checkout e a linha de desconto
em todo lugar que mostra o total de um pedido.

Resumo das decisões (detalhes no plano do backend): percentual ou valor fixo,
sobre o subtotal dos itens (nunca o frete); acumula com promoção; um cupom por
pedido; cancelar o pedido devolve o uso; cupom usado só pode ser desativado;
nova permissão `MANAGE_COUPONS`.

### Contrato da API (definido no plano do backend)

| Método e rota | Corpo / query | Resposta |
| --- | --- | --- |
| `GET /admin/coupons` | `?search&active&page&size` | página de `Coupon` (com `usesCount` e `status`) |
| `POST /admin/coupons` | `CouponInput` | `201` · `400` · `409` código repetido |
| `PUT /admin/coupons/{id}` | `CouponInput` | `200` · `400` · `404` · `409` |
| `PATCH /admin/coupons/{id}/active` | `{ active }` | `200` |
| `DELETE /admin/coupons/{id}` | — | `204` · `409` cupom já usado |
| `GET /admin/coupons/{id}/redemptions` | `?page&size` | página de `CouponRedemption` |
| `POST /cart/coupon` | `{ code }` | `200 { code, discountAmount, subtotal }` · `422 { message }` |
| `POST /orders` | novo campo opcional `couponCode` | `422 { message }` se o cupom não vale mais |
| Respostas de pedido | — | novos `discountAmount` e `couponCode` |

`status` do cupom: `ACTIVE`, `SCHEDULED`, `EXPIRED`, `EXHAUSTED` ou `INACTIVE`.

---

## 1. Problemas encontrados

- **F1** — `components/forms/CheckoutForm.tsx:30,129`: o resumo usa
  `selectCartTotal` + frete, sem campo de cupom nem linha de desconto.
- **F2** — Não há tela de cupons. O grupo Vendas não tem o item.
- **F3** — Onde o total do pedido aparece, não existe linha de desconto:
  `CustomerOrdersContent`, `OrderDetailContent` (painel), `PaymentsContent` e
  `PaymentConfirmContent`.
- **F4** — `types/index.ts:14`: a união de permissões não tem `MANAGE_COUPONS`, e
  a tela de permissões do funcionário lista a partir dela.

---

## 2. Testes a incluir/alterar

### BFF

- `app/api/admin/coupons/__tests__/route.test.ts`, `[id]/__tests__/route.test.ts`,
  `[id]/active` e `[id]/redemptions`: repassam o corpo, a query e o `Authorization`.
- `app/api/cart/coupon/__tests__/route.test.ts`: repassa o código e devolve 422
  com a mensagem.
- `app/api/orders/__tests__/route.test.ts` (novo, porque a rota não tem teste
  hoje): `couponCode` vai no corpo.

### `components/forms/__tests__/CouponForm.test.tsx` (novo)

O form tem validação própria.

- Código: normaliza para maiúsculas e dá erro fora do padrão.
- Tipo percentual: valor entre 1 e 100, com teto opcional visível. Fixo: valor > 0, sem teto.
- Fim antes do início → erro.
- Limites opcionais (vazio = sem limite).
- `valueLocked` (cupom já usado): tipo e valor desabilitados, com texto explicando o motivo.

### `app/(employee)/dashboard/coupons/__tests__/CouponsContent.test.tsx` (novo)

- Lista com código, desconto ("10%" ou "R$ 20,00"), validade, usos
  ("3 / 100" ou "3 / ∞") e situação (Ativo, Agendado, Expirado, Esgotado, Inativo).
- Criar e editar via Dialog + `CouponForm` (`within(dialog)`).
- `Switch` ativo/inativo na linha → `PATCH`.
- Excluir sem usos → confirmação → `DELETE`. Com usos, o botão fica desabilitado
  com o tooltip "Cupom já usado — desative".
- "Ver usos" abre o Dialog com a tabela de pedidos (link para o pedido).
- 409 (código repetido) → toast e o Dialog continua aberto.
- Sem `MANAGE_COUPONS` → `replace('/dashboard')`.

### `app/(admin)/dashboard/admin/coupons/__tests__/page.test.tsx` (novo)

- A página do admin renderiza o `CouponsContent`.

### Checkout (`app/(customer)/__tests__/checkout.page.test.tsx`, alterar)

- Campo "Cupom de desconto" + "Aplicar" → `POST /api/cart/coupon`. Com sucesso,
  mostra a linha "Desconto (CODIGO) − R$ X", recalcula o total e oferece "Remover".
- Recusa → mensagem do backend abaixo do campo, e o total inalterado.
- Criar pedido manda `couponCode`. Com 422 no pedido (cupom ficou inválido), o
  checkout remove o cupom, mostra a mensagem e **não** redireciona.
- Mudar o carrinho ou o frete mantém o cupom e revalida.

### `components/order/__tests__/OrderTotals.test.tsx` (novo)

- Com `discountAmount > 0`, mostra subtotal, "Desconto (CODIGO)", frete e total.
  Sem desconto, a linha de desconto não aparece.

### Exibição do pedido

- `CustomerOrdersContent`, `OrderDetailContent`, `PaymentsContent` e
  `PaymentConfirmContent`: um caso cada, confirmando que usam o `OrderTotals` e
  mostram o desconto.

### Permissões e menu

- A tela de permissões do funcionário (`employee.permissions.page.test.tsx`)
  lista "Gerenciar cupons".
- Testes dos shells: item **Cupons** no grupo Vendas. No funcionário, só com
  `MANAGE_COUPONS`.

---

## 3. O que entra no projeto

### Tipos

1. **`types/index.ts`**:
   - `EmployeePermission` ganha `'MANAGE_COUPONS'`;
   - `CouponType = 'PERCENT' | 'FIXED'` e `CouponStatus`;
   - `Coupon`, `CouponInput`, `CouponRedemption` e `CouponValidation { code; discountAmount; subtotal }`;
   - os tipos de pedido ganham `discountAmount?: number` e `couponCode?: string | null`.

### BFF

2. **`app/api/admin/coupons/route.ts`** (`GET`, `POST`), **`[id]/route.ts`**
   (`PUT`, `DELETE`), **`[id]/active/route.ts`** (`PATCH`) e
   **`[id]/redemptions/route.ts`** (`GET`).
3. **`app/api/cart/coupon/route.ts`** (`POST`).
4. **`app/api/orders/route.ts`**: o corpo já é repassado, então só o teste muda.

### Componentes

5. **`components/forms/CouponForm.tsx`** (novo, puro): código, tipo (`Radio`),
   valor (`NumberInput`), teto (só no percentual), subtotal mínimo, início e fim
   (`datetime-local`), usos totais e por cliente, e ativo (`Switch`). Recebe
   `valueLocked`. Os erros são calculados das props.
6. **`components/content/dashboard/sales/CouponsContent.tsx`** (novo):
   `<Container>` sem `width`, com `PermissionGuard(['MANAGE_COUPONS'])`, `Table` +
   `usePaginatedFetch` + `SearchField`, Dialog de criar/editar, Dialog de usos,
   `ConfirmDeleteDialog`, e `Badge` de situação.
7. **Checkout**: `components/forms/CouponField.tsx` (puro e controlado, junto do
   `CheckoutAuth`), com `Input` + `Button` "Aplicar"/"Remover", e o estado no pai
   (`CheckoutForm`). O `CheckoutForm` guarda o `CouponValidation`, mostra a linha
   de desconto no resumo e manda `couponCode` no pedido. Obs.: o `CheckoutForm` já
   tem estado próprio, fora da regra de "forms puros"; este plano não muda isso,
   só acrescenta o estado do cupom junto do estado de frete que já está lá.
8. **`components/order/OrderTotals.tsx`** (novo): subtotal, desconto, frete e
   total, usado nos quatro contents de F3 para as telas não divergirem.
9. **Permissões**: rótulo "Gerenciar cupons" onde as permissões são listadas.
10. **Menu**: `{ label: 'Cupons', icon: 'Ticket', group: VENDAS }` nos dois shells
    (no funcionário com `perms: ['MANAGE_COUPONS']`).

### Páginas

11. **`app/(employee)/dashboard/coupons/page.tsx`** e
    **`app/(admin)/dashboard/admin/coupons/page.tsx`**, com `metadata`.

### Verificação

- `npm test`, `npx tsc --noEmit`, lint dos arquivos tocados e `npm run build`.
- Com o backend do plano irmão no ar, subir o ambiente completo. O usuário confere:
  - criar um cupom de 10% com mínimo de R$ 100 e limite de 1 uso por cliente;
  - aplicar no checkout abaixo do mínimo (recusa) e acima (desconto no resumo);
  - fechar o pedido e ver o desconto no pedido do cliente e no painel;
  - tentar usar de novo (recusa), cancelar o pedido e usar de novo (aceita).
