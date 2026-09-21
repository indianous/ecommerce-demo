'use client'

import { Badge, Select, Table, type TableColumn } from 'base-ds'
import { formatBRL } from '@/lib/format'
import { paymentMethodLabel } from '@/lib/payment-labels'
import type { AdminOrderResponse, OrderStatus } from '@/types'

interface Props {
  orders: AdminOrderResponse[]
  onStatusChange: (orderId: string, status: OrderStatus) => void
}

const STATUS_OPTIONS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  SHIPPED: 'Enviado',
  RETURNED: 'Devolvido',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const STATUS_BADGE_VARIANT: Record<OrderStatus, 'warning' | 'info' | 'primary' | 'success' | 'danger'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  SHIPPED: 'primary',
  RETURNED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
}

export function OrderManagementTable({ orders, onStatusChange }: Props) {
  if (orders.length === 0) {
    return <p>Nenhum pedido encontrado.</p>
  }

  const columns: TableColumn<AdminOrderResponse>[] = [
    {
      key: 'orderNumber',
      header: 'Nº Pedido',
      render: (order) => `#${order.orderNumber}`,
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (order) => (
        <div>
          <div>{order.customerName}</div>
          <div>{order.customerEmail}</div>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (order) => formatBRL(order.totalAmount),
    },
    {
      key: 'itemCount',
      header: 'Itens',
      render: (order) => `${order.itemCount} itens`,
    },
    {
      key: 'payment',
      header: 'Pagamento',
      render: (order) => (
        <div>
          <div>{paymentMethodLabel(order.paymentMethod)}</div>
          <div>{order.paymentStatus}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <Badge variant={STATUS_BADGE_VARIANT[order.status]}>{order.status}</Badge>,
    },
    {
      key: 'statusChange',
      header: 'Alterar status',
      render: (order) => (
        <Select
          id={`status-${order.id}`}
          aria-label="Status"
          value={order.status}
          onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
        />
      ),
    },
  ]

  return <Table columns={columns} data={orders} />
}
