'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Dialog, Heading, Icon, Skeleton, Table, type TableColumn, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { CopyButton } from '@/components/ui/CopyButton'
import { PaginationBar } from '@/components/ui/PaginationBar'
import { RejectPaymentForm } from '@/components/forms/RejectPaymentForm'
import { sortTableData } from '@/lib/sortTableData'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { AdminOrderResponse } from '@/types'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  BOLETO: 'Boleto',
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function PaymentsContent({ basePath = '/dashboard/payments' }: { basePath?: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()

  const [rejectTarget, setRejectTarget] = useState<AdminOrderResponse | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<AdminOrderResponse> | null> => {
    if (!accessToken) return null
    params.set('paymentStatus', 'PENDING')
    try {
      const res = await fetch(`/api/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      return await res.json()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar pagamentos pendentes.' })
      return null
    }
  }, [accessToken, toast])

  const { page, items: orders, setItems: setOrders, totalPages, loading, goToPage } = usePaginatedFetch(fetchPage)

  const closeRejectDialog = () => {
    setRejectTarget(null)
    setRejectReason('')
  }

  const handleConfirmReject = async () => {
    if (!accessToken || !rejectTarget) return
    setRejecting(true)
    try {
      const res = await fetch(`/api/admin/orders/${rejectTarget.id}/payment-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
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
    { key: 'paymentMethod', header: 'Método', render: (o) => PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod },
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
        <Heading as="h1" size="2xl" className="mb-6">
          Gestão de Pagamentos
        </Heading>

        {loading ? (
          <div role="status">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="line" height={40} className="mb-2" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Text size="sm" color="muted">Nenhum pagamento pendente.</Text>
        ) : (
          <>
            <Table columns={columns} data={sortedOrders} onSort={(key, direction) => setSort({ key, direction })} />
            <PaginationBar page={page} totalPages={totalPages} onPageChange={goToPage} className="mt-4" />
          </>
        )}
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
