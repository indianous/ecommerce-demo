'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, FilterDropdown, FormField, Heading, Icon, Input, Skeleton, Table, type TableColumn, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { formatBRL } from '@/lib/format'
import { sortTableData } from '@/lib/sortTableData'
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

export function OrdersContent({ orderBasePath = '/dashboard/orders' }: { orderBasePath?: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const [orders, setOrders] = useState<AdminOrderResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!accessToken) return
    const params = new URLSearchParams({ page: '0', size: '20' })
    if (search) params.set('search', search)
    statusFilter.forEach((s) => params.append('status', s))
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

  const sortedOrders = sort
    ? sortTableData(orders, sort.key as keyof AdminOrderResponse, sort.direction, sort.key === 'totalAmount' ? 'number' : sort.key === 'orderNumber' ? 'number' : 'string')
    : orders

  const columns: TableColumn<AdminOrderResponse>[] = [
    { key: 'orderNumber', header: 'Nº', sortable: true, render: (o) => o.orderNumber },
    { key: 'customerName', header: 'Cliente', render: (o) => o.customerName },
    { key: 'customerEmail', header: 'Email', render: (o) => o.customerEmail },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (o) => <Badge variant={STATUS_BADGE_VARIANT[o.status]}>{STATUS_LABELS[o.status]}</Badge>,
    },
    { key: 'totalAmount', header: 'Total', sortable: true, render: (o) => formatBRL(o.totalAmount) },
    {
      key: 'actions',
      header: 'Ações',
      render: (o) => (
        <Button iconOnly leftIcon={<Icon name="Eye" size="sm" />} aria-label={`Ver detalhe do pedido ${o.orderNumber}`} size="sm" variant="outline" onClick={() => router.push(`${orderBasePath}/${o.id}`)} />
      ),
    },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_ORDERS', 'MANAGE_SHIPPING', 'MANAGE_ORDER_STATUS_REQUESTS']}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-6">
          Gestão de Pedidos
        </Heading>

        <div className="mb-4 flex flex-wrap gap-3 items-start">
          <FormField label="Buscar pedidos" id="orders-search" className="w-64">
            <Input
              id="orders-search"
              placeholder="Buscar por nº do pedido, cliente ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FormField>
          <FilterDropdown
            label="Status"
            options={ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            value={statusFilter}
            onApply={setStatusFilter}
          />
        </div>

        {loading ? (
          <div role="status">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="line" height={40} className="mb-2" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Text size="sm" color="muted">Nenhum pedido encontrado.</Text>
        ) : (
          <Table
            columns={columns}
            data={sortedOrders}
            onSort={(key, direction) => setSort({ key, direction })}
            className="mb-6"
          />
        )}
      </main>
    </PermissionGuard>
  )
}
