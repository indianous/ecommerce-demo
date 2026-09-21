'use client'

import { useCallback, useRef, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { useRouter } from 'next/navigation'
import { Button, Dialog, Icon, Table, type TableColumn, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { CopyButton } from '@/components/ui/CopyButton'
import { RejectPaymentForm } from '@/components/forms/RejectPaymentForm'
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
import { paymentMethodLabel } from '@/lib/payment-labels'
import type { AdminOrderResponse } from '@/types'

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function PaymentsContent({ basePath = '/dashboard/payments' }: { basePath?: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const searchRef = useRef('')

  const [rejectTarget, setRejectTarget] = useState<AdminOrderResponse | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<AdminOrderResponse> | null> => {
    if (!accessToken) return null
    params.set('paymentStatus', 'PENDING')
    if (searchRef.current) params.set('search', searchRef.current)
    try {
      const res = await authFetch(`/api/admin/orders?${params}`)
      if (!res.ok) throw new Error()
      return await res.json()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar pagamentos pendentes.' })
      return null
    }
  }, [accessToken, toast])

  const { page, items: orders, setItems: setOrders, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const closeRejectDialog = () => {
    setRejectTarget(null)
    setRejectReason('')
  }

  const handleConfirmReject = async () => {
    if (!accessToken || !rejectTarget) return
    setRejecting(true)
    try {
      const res = await authFetch(`/api/admin/orders/${rejectTarget.id}/payment-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ status: 'FAILED', rejectionReason: rejectReason }),
      })
      if (!res.ok) throw new Error()
      setOrders((prev) => prev.filter((o) => o.id !== rejectTarget.id))
      toast({ variant: 'success', description: 'Pagamento rejeitado.' })
      closeRejectDialog()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao rejeitar pagamento.' })
    } finally {
      setRejecting(false)
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
    {
      key: 'customerEmail',
      header: 'E-mail',
      render: (o) => (
        <span className="inline-flex items-center gap-2">
          {o.customerEmail}
          <CopyButton value={o.customerEmail} label="e-mail do cliente" />
        </span>
      ),
    },
    { key: 'paymentMethod', header: 'Método', render: (o) => paymentMethodLabel(o.paymentMethod) },
    { key: 'totalAmount', header: 'Total', sortable: true, render: (o) => formatBRL(o.totalAmount) },
    {
      key: 'actions',
      header: 'Ações',
      render: (o) => (
        <div className="flex gap-2">
          <Button iconOnly leftIcon={<Icon name="Check" size="sm" />} aria-label={`Confirmar pagamento do pedido ${o.orderNumber}`} size="sm" variant="outline" onClick={() => router.push(`${basePath}/${o.id}/confirm`)} />
          <Button iconOnly leftIcon={<Icon name="Ban" size="sm" />} aria-label={`Rejeitar pagamento do pedido ${o.orderNumber}`} size="sm" variant="danger" onClick={() => setRejectTarget(o)} />
        </div>
      ),
    },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_PAYMENTS']}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <ManagementPageHeader title="Gestão de Pagamentos" />
        <ManagementPageBody>
          <ManagementContentHeader
            searchId="payments-search"
            searchLabel="Buscar pagamentos"
            searchPlaceholder="Buscar por nº do pedido, cliente ou e-mail..."
            onSearch={handleSearch}
          />

          <SelectionBar selectedCount={selection.selectedCount} onClear={selection.clear} />

          <ManagementContentBody loading={loading} empty={orders.length === 0} emptyMessage="Nenhum pagamento pendente." loadingLabel="Carregando pagamentos">
            <Table columns={columns} data={sortedOrders} onSort={(key, direction) => setSort({ key, direction })} />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={(p) => { goToPage(p); selection.clear() }} />
        </ManagementPageBody>
      </main>

      <Dialog
        open={rejectTarget !== null}
        onClose={closeRejectDialog}
        title={rejectTarget ? `Rejeitar pagamento do pedido #${rejectTarget.orderNumber}` : ''}
      >
        <RejectPaymentForm
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onSubmit={handleConfirmReject}
          onCancel={closeRejectDialog}
          submitting={rejecting}
        />
      </Dialog>
    </PermissionGuard>
  )
}
