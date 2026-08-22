'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge, Heading, Pagination, Table, type TableColumn, Text } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import type { OrderItemResponse, OrderResponse, OrderStatus } from '@/types'

const PAGE_SIZE = 5

const STATUS_BADGE_VARIANT: Record<OrderStatus, 'warning' | 'info' | 'primary' | 'success' | 'danger'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  SHIPPED: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'danger',
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatDate = (iso: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(iso))

export function OrdersContent() {
  const { accessToken } = useAuthStore()
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [loading, setLoading] = useState(() => Boolean(accessToken))
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/orders', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [accessToken])

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Text color="muted">Carregando pedidos...</Text>
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

  const totalPages = Math.ceil(orders.length / PAGE_SIZE)
  const pageOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: TableColumn<OrderResponse>[] = [
    { key: 'orderNumber', header: 'Pedido', render: (order) => `#${order.orderNumber}` },
    { key: 'createdAt', header: 'Data', render: (order) => formatDate(order.createdAt) },
    { key: 'totalAmount', header: 'Total', render: (order) => formatBRL(order.totalAmount) },
    { key: 'paymentMethod', header: 'Pagamento', render: (order) => order.paymentMethod },
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
        data={pageOrders}
        renderExpandedRow={(order) => <Table columns={itemColumns} data={order.items} className="text-xs" />}
      />

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </main>
  )
}
