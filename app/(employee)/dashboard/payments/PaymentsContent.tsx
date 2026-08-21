'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Dialog, Heading, Icon, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { RejectPaymentForm } from '@/components/forms/RejectPaymentForm'
import type { AdminOrderPage, AdminOrderResponse } from '@/types'

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

  const [orders, setOrders] = useState<AdminOrderResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectTarget, setRejectTarget] = useState<AdminOrderResponse | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const fetchOrders = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch('/api/admin/orders?paymentStatus=PENDING&size=50', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const data: AdminOrderPage = await res.json()
      setOrders(data.content)
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar pagamentos pendentes.' })
    } finally {
      setLoading(false)
    }
  }, [accessToken, toast])

  useEffect(() => { fetchOrders() }, [fetchOrders])

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
          <p className="text-sm text-muted-foreground">Nenhum pagamento pendente.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 border-b">Nº</th>
                <th className="text-left p-2 border-b">Cliente</th>
                <th className="text-left p-2 border-b">E-mail</th>
                <th className="text-left p-2 border-b">Método</th>
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
                  <td className="p-2">{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</td>
                  <td className="p-2">{formatBRL(order.totalAmount)}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button iconOnly leftIcon={<Icon name="Check" size="sm" />} aria-label={`Confirmar pagamento do pedido ${order.orderNumber}`} size="sm" variant="outline" onClick={() => router.push(`${basePath}/${order.id}/confirm`)} />
                      <Button iconOnly leftIcon={<Icon name="Ban" size="sm" />} aria-label={`Rejeitar pagamento do pedido ${order.orderNumber}`} size="sm" variant="danger" onClick={() => setRejectTarget(order)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
