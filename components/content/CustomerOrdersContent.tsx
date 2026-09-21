'use client'

import { useCallback } from 'react'
import { authFetch } from '@/lib/authFetch'
import Link from 'next/link'
import { Badge, Heading, Skeleton, Table, type TableColumn, Text } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PaginationBar } from '@/components/ui/PaginationBar'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import { paymentMethodLabel } from '@/lib/payment-labels'
import { ManualPaymentInstructions } from '@/components/payment/ManualPaymentInstructions'
import type { OrderItemResponse, OrderResponse, OrderStatus } from '@/types'

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

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<OrderResponse> | null> => {
    if (!accessToken) return null
    const res = await authFetch(`/api/orders?${params}`)
    if (!res.ok) return null
    return await res.json()
  }, [accessToken])

  const { page, items: orders, totalPages, loading, goToPage } = usePaginatedFetch(fetchPage, 10)

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8" role="status" aria-label="Carregando pedidos">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="line" height={40} className="mb-2" />
        ))}
      </main>
    )
  }

  if (orders.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Heading as="h1" size="2xl" className="mb-4">
          Meus Pedidos
        </Heading>
        <Text color="muted">Nenhum pedido encontrado.</Text>
      </main>
    )
  }

  const columns: TableColumn<OrderResponse>[] = [
    { key: 'orderNumber', header: 'Pedido', render: (order) => `#${order.orderNumber}` },
    { key: 'createdAt', header: 'Data', render: (order) => formatDate(order.createdAt) },
    { key: 'totalAmount', header: 'Total', render: (order) => formatBRL(order.totalAmount) },
    { key: 'paymentMethod', header: 'Pagamento', render: (order) => paymentMethodLabel(order.paymentMethod) },
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
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Heading as="h1" size="2xl" className="mb-6">
        Meus Pedidos
      </Heading>

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
    </main>
  )
}
