'use client'

import { useCallback, useRef, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { useRouter } from 'next/navigation'
import { Badge, Button, FilterDropdown, Icon, Table, type TableColumn, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { CopyButton } from '@/components/ui/CopyButton'
import { ManagementPageHeader } from '@/components/layout/ManagementPageHeader'
import { ManagementPageBody } from '@/components/layout/ManagementPageBody'
import { ManagementContentHeader } from '@/components/layout/ManagementContentHeader'
import { ManagementContentBody } from '@/components/layout/ManagementContentBody'
import { ManagementContentFooter } from '@/components/layout/ManagementContentFooter'
import { SelectionBar } from '@/components/layout/SelectionBar'
import { makeSelectionColumn } from '@/components/layout/selectionColumn'
import { formatBRL } from '@/lib/format'
import { sortTableData } from '@/lib/sortTableData'
import { useRowSelection } from '@/lib/useRowSelection'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { AdminOrderResponse, OrderStatus } from '@/types'

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  SHIPPED: 'Enviado',
  RETURNED: 'Devolvido',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const STATUS_BADGE_VARIANT: Record<OrderStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  CONFIRMED: 'default',
  SHIPPED: 'default',
  RETURNED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
}

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'RETURNED', 'DELIVERED', 'CANCELLED']

export function EmployeeOrdersContent({ orderBasePath = '/dashboard/orders' }: { orderBasePath?: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const searchRef = useRef('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<AdminOrderResponse> | null> => {
    if (!accessToken) return null
    if (searchRef.current) params.set('search', searchRef.current)
    statusFilter.forEach((s) => params.append('status', s))
    try {
      const res = await authFetch(`/api/admin/orders?${params.toString()}`)
      if (!res.ok) throw new Error()
      return await res.json()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar pedidos.' })
      return null
    }
  }, [accessToken, statusFilter, toast])

  const { page, items: orders, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const sortedOrders = sort
    ? sortTableData(orders, sort.key as keyof AdminOrderResponse, sort.direction, sort.key === 'totalAmount' ? 'number' : sort.key === 'orderNumber' ? 'number' : 'string')
    : orders

  const selection = useRowSelection()

  const columns: TableColumn<AdminOrderResponse>[] = [
    makeSelectionColumn(sortedOrders, (o) => o.id, (o) => `pedido ${o.orderNumber}`, selection.selectedIds, selection.toggle, selection.selectAll),
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
    {
      key: 'customerEmail',
      header: 'Email',
      render: (o) => (
        <span className="inline-flex items-center gap-2">
          {o.customerEmail}
          <CopyButton value={o.customerEmail} label="e-mail do cliente" />
        </span>
      ),
    },
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
        <ManagementPageHeader title="Gestão de Pedidos" />
        <ManagementPageBody>
          <ManagementContentHeader
            searchId="orders-search"
            searchLabel="Buscar pedidos"
            searchPlaceholder="Buscar por nº do pedido, cliente ou e-mail..."
            onSearch={handleSearch}
            filters={
              <FilterDropdown
                label="Status"
                options={ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                value={statusFilter}
                onApply={setStatusFilter}
              />
            }
          />

          <SelectionBar selectedCount={selection.selectedCount} onClear={selection.clear} />

          <ManagementContentBody loading={loading} empty={orders.length === 0} emptyMessage="Nenhum pedido encontrado." loadingLabel="Carregando pedidos">
            <Table
              columns={columns}
              data={sortedOrders}
              onSort={(key, direction) => setSort({ key, direction })}
              className="mb-6"
            />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={(p) => { goToPage(p); selection.clear() }} />
        </ManagementPageBody>
      </main>
    </PermissionGuard>
  )
}
