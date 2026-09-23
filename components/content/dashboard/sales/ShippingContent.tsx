'use client'

import { useCallback, useRef, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { useRouter } from 'next/navigation'
import { Badge, Button, Container, Icon, Table, type TableColumn, useToast } from 'base-ds'
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
import { sortTableData } from '@/lib/sortTableData'
import { useRowSelection } from '@/lib/useRowSelection'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { AdminOrderResponse } from '@/types'

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function ShippingContent({ orderBasePath = '/dashboard/orders' }: { orderBasePath?: string }) {
  const { accessToken } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()
  const searchRef = useRef('')
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [trackingCodes, setTrackingCodes] = useState<Record<string, string>>({})

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<AdminOrderResponse> | null> => {
    if (!accessToken) return null
    params.set('status', 'CONFIRMED')
    if (searchRef.current) params.set('search', searchRef.current)
    const res = await authFetch(`/api/admin/orders?${params}`)
    if (!res.ok) return null
    return await res.json()
  }, [accessToken])

  const { page, items: orders, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const handleBuyLabel = async (orderId: string) => {
    if (!accessToken) return
    setBuyingId(orderId)
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}/shipping-label`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', description: data.message ?? 'Erro ao comprar etiqueta' })
        return
      }
      setTrackingCodes((prev) => ({ ...prev, [orderId]: data.trackingCode }))
      toast({ variant: 'success', description: 'Etiqueta comprada com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao comprar etiqueta' })
    } finally {
      setBuyingId(null)
    }
  }

  const sortedOrders = sort
    ? sortTableData(orders, sort.key as keyof AdminOrderResponse, sort.direction, sort.key === 'orderNumber' || sort.key === 'totalAmount' ? 'number' : 'string')
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
    { key: 'totalAmount', header: 'Total', sortable: true, render: (o) => formatBRL(o.totalAmount) },
    { key: 'status', header: 'Status', render: () => <Badge variant="default">Confirmado</Badge> },
    {
      key: 'tracking',
      header: 'Rastreio',
      render: (o) => {
        const trackingCode = trackingCodes[o.id] ?? o.trackingCode
        if (trackingCode) return <span>{trackingCode}</span>
        return (
          <Button
            iconOnly
            leftIcon={<Icon name="Package" size="sm" />}
            aria-label={`Comprar etiqueta ${o.orderNumber}`}
            size="sm"
            variant="outline"
            isLoading={buyingId === o.id}
            onClick={() => handleBuyLabel(o.id)}
          />
        )
      },
    },
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
      <Container>
        <ManagementPageHeader title="Gestão de Envios" description="Pedidos confirmados aguardando envio" />
        <ManagementPageBody>
          <ManagementContentHeader
            searchId="shipping-search"
            searchLabel="Buscar pedidos"
            searchPlaceholder="Buscar por nº do pedido, cliente ou e-mail..."
            onSearch={handleSearch}
          />

          <SelectionBar selectedCount={selection.selectedCount} onClear={selection.clear} />

          <ManagementContentBody loading={loading} empty={orders.length === 0} emptyMessage="Nenhum pedido aguardando envio." loadingLabel="Carregando pedidos">
            <Table columns={columns} data={sortedOrders} onSort={(key, direction) => setSort({ key, direction })} />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={(p) => { goToPage(p); selection.clear() }} />
        </ManagementPageBody>
      </Container>
    </PermissionGuard>
  )
}
