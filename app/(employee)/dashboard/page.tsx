'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { OrderManagementTable } from '@/components/employee/OrderManagementTable'
import type { AdminOrderResponse, OrderStatus } from '@/types'

export default function DashboardPage() {
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

  if (loading) return <main><p>Carregando pedidos...</p></main>

  return (
    <main>
      <h1>Gestão de Pedidos</h1>
      <OrderManagementTable orders={orders} onStatusChange={handleStatusChange} />
    </main>
  )
}
