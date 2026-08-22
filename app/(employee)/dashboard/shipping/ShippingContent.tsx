'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Heading, Icon, Skeleton, Table, type TableColumn, Text } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { sortTableData } from '@/lib/sortTableData'
import type { AdminOrderPage, AdminOrderResponse } from '@/types'

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function ShippingContent({ orderBasePath = '/dashboard/orders' }: { orderBasePath?: string }) {
  const { accessToken } = useAuthStore()
  const router = useRouter()
  const [orders, setOrders] = useState<AdminOrderResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch('/api/admin/orders?status=CONFIRMED&size=50', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const data: AdminOrderPage = await res.json()
      setOrders(data.content)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const sortedOrders = sort
    ? sortTableData(orders, sort.key as keyof AdminOrderResponse, sort.direction, sort.key === 'orderNumber' || sort.key === 'totalAmount' ? 'number' : 'string')
    : orders

  const columns: TableColumn<AdminOrderResponse>[] = [
    { key: 'orderNumber', header: 'Nº', sortable: true, render: (o) => o.orderNumber },
    { key: 'customerName', header: 'Cliente', render: (o) => o.customerName },
    { key: 'totalAmount', header: 'Total', sortable: true, render: (o) => formatBRL(o.totalAmount) },
    { key: 'status', header: 'Status', render: () => <Badge variant="default">Confirmado</Badge> },
    {
      key: 'actions',
      header: 'Ações',
      render: (o) => (
        <Button iconOnly leftIcon={<Icon name="Truck" size="sm" />} aria-label={`Ver pedido ${o.orderNumber}`} size="sm" variant="outline" onClick={() => router.push(`${orderBasePath}/${o.id}`)} />
      ),
    },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_SHIPPING']}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-2">
          Gestão de Envios
        </Heading>
        <p className="text-sm text-muted-foreground mb-6">
          Pedidos confirmados aguardando envio
        </p>

        {loading ? (
          <div role="status">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="line" height={40} className="mb-2" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Text size="sm" color="muted">Nenhum pedido aguardando envio.</Text>
        ) : (
          <Table columns={columns} data={sortedOrders} onSort={(key, direction) => setSort({ key, direction })} />
        )}
      </main>
    </PermissionGuard>
  )
}
