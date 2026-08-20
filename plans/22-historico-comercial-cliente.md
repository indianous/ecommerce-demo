# Histórico comercial do cliente: compras e reviews no admin (frontend)

## Contexto

Par do plano de backend [[22-historico-comercial-cliente]]. Só consome os
campos novos (`purchaseSummary`, `recentOrders`, `reviews`) que
`CustomerDetailResponse` passa a devolver, numa nova seção da tela de
detalhe do cliente.

## 1. Problemas encontrados

- `types/index.ts` — `CustomerDetailResponse` não tem
  `purchaseSummary`/`recentOrders`/`reviews`.
- `app/(employee)/dashboard/customers/[id]/CustomerDetailContent.tsx` não
  tem seção de histórico de compras nem de reviews — só endereços.
- `Rating` do `base-ds` já é usado em `ProductReviewCard.tsx` pra mostrar
  nota de review — mesmo componente reaproveitável aqui, sem nada novo pra
  pedir ao `base-ds`.

## 2. Testes a incluir/alterar

- Teste de página de `CustomerDetailContent` (o mesmo arquivo novo já
  citado no plano da fase 1, `customers.detail.page.test.tsx`):
  - mostra "Total de pedidos", "Total gasto" (formatado em BRL) e "Última
    compra" (formatada) a partir de `purchaseSummary`;
  - lista os pedidos recentes com número, status e valor;
  - lista as reviews com nome do produto, nota (`Rating` `readOnly`) e
    comentário;
  - com `recentOrders: []` e `reviews: []`, mostra estado vazio ("Nenhuma
    compra ainda." / "Nenhuma avaliação ainda.") em vez de listas vazias
    silenciosas — mesmo padrão que `ProductGrid` já usa pro catálogo.

## 3. O que entra no projeto

Sem BFF novo — continua usando `GET /api/admin/customers/[id]` (já
existente), só com payload maior.

### Tipos — `types/index.ts`

```ts
export interface CustomerPurchaseSummary {
  totalOrders: number
  totalSpent: number
  lastPurchaseAt: string | null
}

export interface CustomerOrderSummary {
  id: string
  orderNumber: number
  status: OrderStatus
  totalAmount: number
  createdAt: string
}

export interface CustomerReviewSummary {
  id: string
  productName: string
  productId: string
  rating: number
  comment: string
  createdAt: string
}

// em CustomerDetailResponse:
purchaseSummary: CustomerPurchaseSummary
recentOrders: CustomerOrderSummary[]
reviews: CustomerReviewSummary[]
```

### `CustomerDetailContent.tsx`

- Nova seção "Histórico de compras": 3 `Text` com o resumo
  (`totalOrders`, `totalSpent` formatado com `Intl.NumberFormat('pt-BR',
  { style: 'currency', currency: 'BRL' })` — mesmo helper que `ProductCard`
  já usa, vale extrair pra `lib/format.ts` já que essa é a 3ª ou 4ª
  ocorrência no projeto) + lista de `recentOrders` (`Badge` pro status,
  reaproveitando o mapeamento cor/status que `OrderManagementTable.tsx`
  já tem).
- Nova seção "Avaliações": lista de `reviews`, cada uma com
  `ProductReviewCard`-like layout (nome do produto como link pro produto,
  `Rating readOnly`, comentário) — se o layout ficar idêntico ao
  `ProductReviewCard` existente, reaproveita o componente direto em vez de
  duplicar.

### Fora de escopo

- Não linka pra tela de detalhe do pedido a partir daqui — só mostra o
  resumo. Se quiser esse link depois, é UI adicional simples, não precisa
  de plano novo.
