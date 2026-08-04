'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Heading, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
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
  const [rejectingId, setRejectingId] = useState<string | null>(null)

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

  const handleReject = async (order: AdminOrderResponse) => {
    if (!accessToken) return
    setRejectingId(order.id)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/payment-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: 'FAILED' }),
      })
      if (!res.ok) throw new Error()
      setOrders((prev) => prev.filter((o) => o.id !== order.id))
      toast({ variant: 'success', description: 'Pagamento rejeitado.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao rejeitar pagamento.' })
    } finally {
      setRejectingId(null)
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`${basePath}/${order.id}/confirm`)}
                        aria-label={`Confirmar pagamento do pedido ${order.orderNumber}`}
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={rejectingId === order.id}
                        onClick={() => handleReject(order)}
                        aria-label={`Rejeitar pagamento do pedido ${order.orderNumber}`}
                      >
                        Rejeitar
                      </Button>
                    </div>
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
