# Link para página do produto nos itens do pedido (cliente)

## 1. Problemas encontrados

- `app/(customer)/orders/page.tsx:131-137` — ao expandir um pedido, cada item é renderizado como texto estático (`<td>{item.productName}</td>`), sem nenhuma forma de o cliente navegar até a página do produto correspondente. `item.productId` já está disponível no objeto (usado como `key` na linha 131) mas não é utilizado para link.

## 2. Testes a incluir/alterar

**`app/(customer)/__tests__/orders.page.test.tsx`**
- Novo teste: ao expandir um pedido, o nome do produto (`item.productName`) deve ser renderizado como link (`getByRole('link', { name: /notebook/i })`) apontando para `/catalog/{productId}` (reaproveitar fixture existente com `productId: 'p1'` → `href="/catalog/p1"`).

## 3. O que entra no projeto

- **Tipos**: nenhuma alteração — `OrderItemResponse` (frontend e backend) já expõe `productId`.
- **Backend**: nenhuma alteração — `OrderItemResponse.java` já inclui `productId`.
- **BFF**: nenhuma alteração — `app/api/orders/route.ts` já repassa `items[].productId`.
- **Componentes/páginas**: `app/(customer)/orders/page.tsx` — envolver `item.productName` em `<Link href={`/catalog/${item.productId}`}>`, usando `next/link`, seguindo o mesmo padrão já usado em `components/product/ProductCard.tsx:48`.
