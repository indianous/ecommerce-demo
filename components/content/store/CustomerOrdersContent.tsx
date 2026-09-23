'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { authFetch } from '@/lib/authFetch'
import Link from 'next/link'
import { Badge, Button, Container, Heading, Icon, Skeleton, Table, type TableColumn, Text } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PaginationBar } from '@/components/ui/PaginationBar'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import { paymentMethodLabel } from '@/lib/payment-labels'
import { payNowState } from '@/lib/payment-checkout'
import { ManualPaymentInstructions } from '@/components/payment/ManualPaymentInstructions'
import type { OrderItemResponse, OrderResponse, OrderStatus } from '@/types'
import { OrderTotal } from '@/components/order/OrderTotal'

const STATUS_BADGE_VARIANT: Record<OrderStatus, 'warning' | 'info' | 'primary' | 'success' | 'danger'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  SHIPPED: 'primary',
  RETURNED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatDate = (iso: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(iso))

export function CustomerOrdersContent() {
  const { accessToken } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Retorno do gateway (?payment=success|cancelled): a mensagem fica guardada e o parâmetro sai da URL,
  // pra um refresh não repeti-la.
  const [paymentReturn] = useState<'success' | 'cancelled' | null>(() => {
    const value = searchParams.get('payment')
    return value === 'success' || value === 'cancelled' ? value : null
  })
  const [now] = useState(() => Date.now())
  const query = searchParams.toString()
  const hasPaymentParam = searchParams.get('payment') !== null

  useEffect(() => {
    if (!hasPaymentParam) return
    const params = new URLSearchParams(query)
    params.delete('payment')
    const rest = params.toString()
    router.replace(rest ? `${pathname}?${rest}` : pathname)
  }, [hasPaymentParam, query, pathname, router])

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<OrderResponse> | null> => {
    if (!accessToken) return null
    const res = await authFetch(`/api/orders?${params}`)
    if (!res.ok) return null
    return await res.json()
  }, [accessToken])

  const { page, items: orders, totalPages, loading, goToPage } = usePaginatedFetch(fetchPage, 10)

  if (loading) {
    return (
      <Container width="4xl" role="status" aria-label="Carregando pedidos">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="line" height={40} className="mb-2" />
        ))}
      </Container>
    )
  }

  if (orders.length === 0) {
    return (
      <Container width="4xl" spacing="loose" className="text-center">
        <Heading as="h1" size="2xl" className="mb-4">
          Meus Pedidos
        </Heading>
        <Text color="muted">Nenhum pedido encontrado.</Text>
      </Container>
    )
  }

  const columns: TableColumn<OrderResponse>[] = [
    { key: 'orderNumber', header: 'Pedido', render: (order) => `#${order.orderNumber}` },
    { key: 'createdAt', header: 'Data', render: (order) => formatDate(order.createdAt) },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (order) => <OrderTotal totalAmount={order.totalAmount} discountAmount={order.discountAmount} couponCode={order.couponCode} />,
    },
    {
      key: 'paymentMethod',
      header: 'Pagamento',
      render: (order) => {
        const payNow = payNowState(order, now)
        return (
          <span className="inline-flex flex-wrap items-center gap-2">
            {paymentMethodLabel(order.paymentMethod)}
            {payNow === 'pay' && (
              <Button leftIcon={<Icon name="CreditCard" size="sm" />} as="a" href={order.checkoutUrl ?? "#"} size="sm" variant="primary">Pagar agora</Button>
            )}
            {payNow === 'expired' && <Text size="sm" color="muted">Checkout expirado</Text>}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <Badge variant={STATUS_BADGE_VARIANT[order.status]}>{order.status}</Badge>,
    },
  ]

  const itemColumns: TableColumn<OrderItemResponse>[] = [
    {
      key: 'productName',
      header: 'Produto',
      render: (item) => (
        <Link href={`/catalog/${item.productId}`} className="hover:underline">
          {item.productName}
        </Link>
      ),
    },
    { key: 'quantity', header: 'Qtd', render: (item) => item.quantity },
    { key: 'unitPrice', header: 'Preço unit.', render: (item) => formatBRL(item.unitPrice) },
    { key: 'subtotal', header: 'Subtotal', render: (item) => formatBRL(item.subtotal) },
  ]

  return (
    <Container width="4xl">
      <Heading as="h1" size="2xl" className="mb-6">
        Meus Pedidos
      </Heading>

      {paymentReturn === 'success' && (
        <Text role="status" className="mb-4">Recebemos seu pagamento. A confirmação pode levar alguns instantes.</Text>
      )}
      {paymentReturn === 'cancelled' && (
        <Text role="status" className="mb-4">Pagamento não concluído. Você pode tentar de novo em &quot;Pagar agora&quot;.</Text>
      )}

      <Table
        columns={columns}
        data={orders}
        renderExpandedRow={(order) => (
          <>
            <ManualPaymentInstructions order={order} />
            <Table columns={itemColumns} data={order.items} className="text-xs" />
          </>
        )}
      />

      <div className="mt-6 flex justify-center">
        <PaginationBar page={page} totalPages={totalPages} onPageChange={goToPage} />
      </div>
    </Container>
  )
}
