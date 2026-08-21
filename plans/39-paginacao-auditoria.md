# 39 — Auditoria e padronização de paginação (frontend)

## Contexto

Plano irmão: `backend/plans/39-paginacao-auditoria.md`. Achado principal: **a
maioria dos endpoints do dashboard já devolve `Page<T>` completo (`totalElements`,
`totalPages` etc.) e o frontend simplesmente ignora — pega só `data.content` e
renderiza tudo, sem UI de paginação, sem mandar `page`/`size`**. Sem
`spring.data.web.pageable.*` configurado em `application.properties`, o Spring usa
o default: `size=20` — ou seja, **qualquer lista do dashboard com mais de 20 (ou
50, nas telas que já fixam `size=50` na mão) registros está sendo cortada
silenciosamente hoje**, sem nenhum indício visual de que existe mais coisa.

Já existe um padrão de referência **completo** (paginação real + estado na URL) no
catálogo público: `app/(public)/catalog/page.tsx` (server component, lê `page` de
`searchParams`) + `components/catalog/CatalogPagination.tsx` (`router.push` monta
a URL de novo com o `page` novo). É esse padrão que deveria se repetir no
dashboard — hoje nenhuma tela de lá faz isso.

## 1. Checklist — toda tela de listagem, classificada

**Backend pronto (`Page<T>`), frontend não usa nada disso — maior parte do
trabalho, é só wiring:**

| Tela | Chama | Falta hoje |
|---|---|---|
| `CustomersContent.tsx` | `/api/admin/customers` | Sem `page`/`size`, sem `<Pagination>` |
| `ProductsContent.tsx` | `/api/admin/products` | Idem |
| `DeletedProductsContent.tsx` | `/api/admin/products?active=false` | Idem |
| `OrdersContent.tsx` (employee, reusado pelo admin) | `/api/admin/orders` | Manda `size=20` fixo, sem forma de ver a página 2 |
| `ShippingContent.tsx` | `/api/admin/orders?status=CONFIRMED&size=50` | `size=50` fixo, sem paginação |
| `PaymentsContent.tsx` | `/api/admin/orders?paymentStatus=PENDING&size=50` | Idem |
| `SolicitacoesContent.tsx` | `/api/admin/orders/change-requests` | Sem paginação |
| `AuditLogsContent.tsx` | `/api/admin/audit-logs` | Sem paginação |
| `StockMovementHistoryContent.tsx` | `/api/admin/products/{id}/stock-movements` | Sem paginação |
| `EmployeeManagementTable.tsx` (via `EmployeesContent.tsx` × 2, e futuro `AdminsContent.tsx` do plano #38) | `/api/admin/employees` | Sem paginação |
| `ProductReviewsSection.tsx` | `/api/products/{id}/reviews` | **Já funciona de verdade** (manda `page`, atualiza a partir da resposta, `Pagination` ligada) — única diferença do padrão ideal é guardar a página em `useState` local em vez da URL; como é uma seção dentro da página pública de produto (não uma tela cheia), decisão do usuário se vale a pena mudar |

**Backend também precisa de trabalho** (ver plano de backend, seção 1):

| Tela | Chama | Situação |
|---|---|---|
| `app/(customer)/orders/OrdersContent.tsx` | `/api/orders` | Busca **tudo** de uma vez, pagina só no browser (`orders.slice(...)`) com `useState` local — nem manda parâmetro nenhum pro backend, nem guarda a página na URL |
| `ExpiringLotsContent.tsx` | `/api/admin/stock-lots/expiring` | Backend devolve lista inteira, frontend renderiza tudo sem paginação nenhuma |

**Fora do escopo, de propósito** (mesma razão do lado backend — dado limitado por
natureza, não por implementação): `CustomerDetailContent.tsx` (`recentOrders` é
um preview "recentes", não uma listagem completa — teria que virar uma tela
própria pra fazer sentido paginar), endereços do cliente, wishlist, avaliações
próprias, banners, itens de navegação, categorias, produtos populares/mais
vendidos/relacionados.

**Já correto, referência a seguir:** `app/(public)/catalog/page.tsx` +
`CatalogPagination.tsx` (paginação real, estado na URL).

## 2. Exemplo — página de dashboard convertida pro padrão do catálogo

Usando `CustomersContent.tsx` (backend já pronto, é só wiring) como exemplo —
troca de `useState` local por página vinda da URL, igual o catálogo já faz:

**Antes** (estado só no componente, se perde ao dar F5 ou compartilhar o link):
```tsx
const [customers, setCustomers] = useState<CustomerResponse[]>([])
// ...
const res = await fetch(`/api/admin/customers?${params}`, {...})
const data = await res.json()
setCustomers(data.content ?? data)   // ignora totalPages/totalElements
```

**Depois** (página na URL via `useSearchParams`/`router`, `Pagination` do
base-ds ligada de verdade):
```tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pagination } from 'base-ds'

export function CustomersContent(/* ... */) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const page = Number(searchParams.get('page') ?? '1')

  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [totalPages, setTotalPages] = useState(1)

  const fetchCustomers = useCallback(async (q: string) => {
    const params = new URLSearchParams({ page: String(page - 1), size: '20' })
    if (q) params.set('search', q)
    const res = await fetch(`/api/admin/customers?${params}`, {...})
    const data = await res.json()
    setCustomers(data.content)
    setTotalPages(data.totalPages)
  }, [accessToken, page])

  const goToPage = (next: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(next))
    router.push(`?${params}`)
  }

  // ...
  return (
    <>
      <Table columns={columns} data={customers} />
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={goToPage} />
      )}
    </>
  )
}
```

Esse mesmo esqueleto (state `page` vindo de `useSearchParams`, `fetch` mandando
`page`/`size`, `Pagination` do base-ds só aparecendo quando `totalPages > 1`,
`goToPage` escrevendo de volta na URL) se repete em todas as 11 telas do
checklist que só precisam de wiring — é candidato a virar um hook
(`usePaginatedFetch`?) em vez de reescrever isso 11 vezes; decisão de quem for
implementar.

## 3. Testes a incluir (quando for implementar de fato)

- Por tela: URL com `?page=2` carrega a página 2 direto (sem precisar clicar em
  nada); clicar em "Próxima" no `Pagination` atualiza a URL pra `?page=2` e busca
  de novo; com `totalPages<=1`, o `Pagination` não aparece.
- `app/(customer)/orders/OrdersContent.tsx`: depois de virar `Page<T>` de
  verdade no backend, os testes que hoje validam a paginação client-side
  (`orders.slice`) mudam pra validar que cada clique em "Próxima" dispara um novo
  `fetch` com `page` incrementado, em vez de só reindexar um array já carregado.
