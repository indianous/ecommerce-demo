'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Icon, Table, type TableColumn } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { CopyButton } from '@/components/ui/CopyButton'
import { ManagementPageHeader } from '@/components/layout/ManagementPageHeader'
import { ManagementPageBody } from '@/components/layout/ManagementPageBody'
import { ManagementContentHeader } from '@/components/layout/ManagementContentHeader'
import { ManagementContentBody } from '@/components/layout/ManagementContentBody'
import { ManagementContentFooter } from '@/components/layout/ManagementContentFooter'
import { sortTableData } from '@/lib/sortTableData'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { AdminOrderResponse } from '@/types'

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function ShippingContent({ orderBasePath = '/dashboard/orders' }: { orderBasePath?: string }) {
  const { accessToken } = useAuthStore()
  const router = useRouter()
  const searchRef = useRef('')
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<AdminOrderResponse> | null> => {
    if (!accessToken) return null
    params.set('status', 'CONFIRMED')
    if (searchRef.current) params.set('search', searchRef.current)
    const res = await fetch(`/api/admin/orders?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return await res.json()
  }, [accessToken])

  const { page, items: orders, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

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
        <ManagementPageHeader title="Gestão de Envios" description="Pedidos confirmados aguardando envio" />
        <ManagementPageBody>
          <ManagementContentHeader
            searchId="shipping-search"
            searchLabel="Buscar pedidos"
            searchPlaceholder="Buscar por nº do pedido, cliente ou e-mail..."
            onSearch={handleSearch}
          />

          <ManagementContentBody loading={loading} empty={orders.length === 0} emptyMessage="Nenhum pedido aguardando envio." loadingLabel="Carregando pedidos">
            <Table columns={columns} data={sortedOrders} onSort={(key, direction) => setSort({ key, direction })} />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={goToPage} />
        </ManagementPageBody>
      </main>
    </PermissionGuard>
  )
}
