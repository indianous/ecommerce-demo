'use client'

import type { AdminOrderResponse, OrderStatus } from '@/types'

interface Props {
  orders: AdminOrderResponse[]
  onStatusChange: (orderId: string, status: OrderStatus) => void
}

const STATUS_OPTIONS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function OrderManagementTable({ orders, onStatusChange }: Props) {
  if (orders.length === 0) {
    return <p>Nenhum pedido encontrado.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Total</th>
          <th>Itens</th>
          <th>Pagamento</th>
          <th>Status</th>
          <th>Alterar status</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>
              <div>{order.customerName}</div>
              <div>{order.customerEmail}</div>
            </td>
            <td>{formatBRL(order.totalAmount)}</td>
            <td>{order.itemCount} itens</td>
            <td>
              <div>{order.paymentMethod}</div>
              <div>{order.paymentStatus}</div>
            </td>
            <td>{order.status}</td>
            <td>
              <select
                aria-label="Status"
                value={order.status}
                onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
