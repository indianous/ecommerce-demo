'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge, Heading, Icon, Pagination, Text } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import type { OrderResponse, OrderStatus } from '@/types'

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/orders', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [accessToken])

  function toggleExpand(orderId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

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

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Heading as="h1" size="2xl" className="mb-6">
        Meus Pedidos
      </Heading>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="w-8 px-2 py-3" />
              <th className="px-4 py-3 text-left font-semibold text-foreground">Pedido</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Data</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Total</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Pagamento</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageOrders.map((order) => (
              <React.Fragment key={order.id}>
                <tr className="hover:bg-muted">
                  <td className="px-2 py-3">
                    {order.items.length > 0 && (
                      <button
                        type="button"
                        aria-label={`Expandir #${order.orderNumber}`}
                        onClick={() => toggleExpand(order.id)}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-border"
                      >
                        <Icon
                          name={expanded.has(order.id) ? 'ChevronDown' : 'ChevronRight'}
                          size="sm"
                        />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">#{order.orderNumber}</td>
                  <td className="px-4 py-3 text-foreground">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3 text-foreground">{formatBRL(order.totalAmount)}</td>
                  <td className="px-4 py-3 text-foreground">{order.paymentMethod}</td>
                  <td className="px-4 py-3 text-foreground">
                    <Badge variant={STATUS_BADGE_VARIANT[order.status]}>{order.status}</Badge>
                  </td>
                </tr>
                {expanded.has(order.id) && (
                  <tr>
                    <td colSpan={6} className="bg-muted/50 px-8 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="pb-1 text-left font-medium">Produto</th>
                            <th className="pb-1 text-left font-medium">Qtd</th>
                            <th className="pb-1 text-left font-medium">Preço unit.</th>
                            <th className="pb-1 text-left font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {order.items.map((item) => (
                            <tr key={item.productId}>
                              <td className="py-1.5 text-foreground">
                                <Link
                                  href={`/catalog/${item.productId}`}
                                  className="hover:underline"
                                >
                                  {item.productName}
                                </Link>
                              </td>
                              <td className="py-1.5 text-foreground">{item.quantity}</td>
                              <td className="py-1.5 text-foreground">{formatBRL(item.unitPrice)}</td>
                              <td className="py-1.5 text-foreground">{formatBRL(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </main>
  )
}
