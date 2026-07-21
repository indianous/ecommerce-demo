'use client'
import { useCallback, useEffect, useState } from 'react'
import { Heading, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { OrderManagementTable } from '@/components/employee/OrderManagementTable'
import type { AdminOrderResponse, OrderStatus } from '@/types'

export default function AdminDashboardPage() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [orders, setOrders] = useState<AdminOrderResponse[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      setOrders(await res.json())
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar pedidos.' })
    } finally {
      setLoading(false)
    }
  }, [accessToken, toast])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    if (!accessToken) return
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
    }
  }

  return (
    <div>
      <Heading as="h1" size="2xl" className="mb-6">
        Gestão de Pedidos
      </Heading>

      {loading ? (
        <div role="status" aria-label="Carregando pedidos">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="line" height={48} className="mb-2" />
          ))}
        </div>
      ) : (
        <OrderManagementTable orders={orders} onStatusChange={handleStatusChange} />
      )}
    </div>
  )
}
