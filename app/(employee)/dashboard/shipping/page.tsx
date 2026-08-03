'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Heading, Skeleton } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import type { AdminOrderPage, AdminOrderResponse } from '@/types'

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function ShippingPage() {
  const { accessToken } = useAuthStore()
  const router = useRouter()
  const [orders, setOrders] = useState<AdminOrderResponse[]>([])
  const [loading, setLoading] = useState(true)

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
          <p className="text-muted-foreground">Nenhum pedido aguardando envio.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 border-b">Nº</th>
                <th className="text-left p-2 border-b">Cliente</th>
                <th className="text-left p-2 border-b">Total</th>
                <th className="text-left p-2 border-b">Status</th>
                <th className="text-left p-2 border-b">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b">
                  <td className="p-2">{order.orderNumber}</td>
                  <td className="p-2">{order.customerName}</td>
                  <td className="p-2">{formatBRL(order.totalAmount)}</td>
                  <td className="p-2">
                    <Badge variant="default">Confirmado</Badge>
                  </td>
                  <td className="p-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push('/dashboard/orders/' + order.id)}
                      aria-label={`Ver pedido ${order.orderNumber}`}
                    >
                      Registrar envio
                    </Button>
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
