'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Heading, Input, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import type { AdminOrderResponse, AdminOrderPage, OrderStatus } from '@/types'

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  SHIPPED: 'Enviado',
  RETURNED: 'Devolvido',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const STATUS_BADGE_VARIANT: Record<OrderStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PENDING: 'warning',
  CONFIRMED: 'default',
  SHIPPED: 'secondary',
  RETURNED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
}

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'RETURNED', 'DELIVERED', 'CANCELLED']

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function PedidosPage() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const [orders, setOrders] = useState<AdminOrderResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')

  const fetchOrders = useCallback(async () => {
    if (!accessToken) return
    const params = new URLSearchParams({ page: '0', size: '20' })
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    try {
      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const data: AdminOrderPage = await res.json()
      setOrders(data.content)
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar pedidos.' })
    } finally {
      setLoading(false)
    }
  }, [accessToken, search, statusFilter, toast])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  return (
    <PermissionGuard permissions={['MANAGE_ORDERS', 'MANAGE_SHIPPING', 'MANAGE_ORDER_STATUS_REQUESTS']}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-6">
          Gestão de Pedidos
      </Heading>

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          aria-label="Buscar pedidos"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <select
          aria-label="Filtrar por status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
          className="border rounded p-2 text-sm"
        >
          <option value="">Todos os status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div role="status">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="line" height={40} className="mb-2" />
          ))}
        </div>
      ) : (
        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr>
              <th className="text-left p-2 border-b">Nº</th>
              <th className="text-left p-2 border-b">Cliente</th>
              <th className="text-left p-2 border-b">Email</th>
              <th className="text-left p-2 border-b">Status</th>
              <th className="text-left p-2 border-b">Total</th>
              <th className="text-left p-2 border-b">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b">
                <td className="p-2">{order.orderNumber}</td>
                <td className="p-2">{order.customerName}</td>
                <td className="p-2">{order.customerEmail}</td>
                <td className="p-2">
                  <Badge variant={STATUS_BADGE_VARIANT[order.status]}>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                </td>
                <td className="p-2">{formatBRL(order.totalAmount)}</td>
                <td className="p-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/dashboard/orders/' + order.id)}
                    aria-label={`Ver detalhe do pedido ${order.orderNumber}`}
                  >
                    Ver detalhe
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

    </main>
    </PermissionGuard>
  )
}
