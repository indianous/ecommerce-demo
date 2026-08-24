'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Heading, Icon, Skeleton, Table, type TableColumn, Text } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { CopyButton } from '@/components/ui/CopyButton'
import { PaginationBar } from '@/components/ui/PaginationBar'
import { sortTableData } from '@/lib/sortTableData'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { AdminOrderResponse } from '@/types'

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function ShippingContent({ orderBasePath = '/dashboard/orders' }: { orderBasePath?: string }) {
  const { accessToken } = useAuthStore()
  const router = useRouter()
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<AdminOrderResponse> | null> => {
    if (!accessToken) return null
    params.set('status', 'CONFIRMED')
    const res = await fetch(`/api/admin/orders?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return await res.json()
  }, [accessToken])

  const { page, items: orders, totalPages, loading, goToPage } = usePaginatedFetch(fetchPage)

  const sortedOrders = sort
    ? sortTableData(orders, sort.key as keyof AdminOrderResponse, sort.direction, sort.key === 'orderNumber' || sort.key === 'totalAmount' ? 'number' : 'string')
    : orders

  const columns: TableColumn<AdminOrderResponse>[] = [
    { key: 'orderNumber', header: 'Nº', sortable: true, render: (o) => o.orderNumber },
    {
      key: 'customerName',
      header: 'Cliente',
      render: (o) => (
        <span className="inline-flex items-center gap-2">
          {o.customerName}
          <CopyButton value={o.customerName} label="nome do cliente" />
        </span>
      ),
    },
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
          <>
            <Table columns={columns} data={sortedOrders} onSort={(key, direction) => setSort({ key, direction })} />
            <PaginationBar page={page} totalPages={totalPages} onPageChange={goToPage} className="mt-4" />
          </>
        )}
      </main>
    </PermissionGuard>
  )
}
