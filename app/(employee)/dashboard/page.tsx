'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { OrderManagementTable } from '@/components/employee/OrderManagementTable'
import type { AdminOrderResponse, OrderStatus } from '@/types'

export default function DashboardPage() {
  const { accessToken } = useAuthStore()
  const [orders, setOrders] = useState<AdminOrderResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      setOrders(await res.json())
    } catch {
      setError('Erro ao carregar pedidos.')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

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
  if (error) return <main><p role="alert">{error}</p></main>

  return (
    <main>
      <h1>Gestão de Pedidos</h1>
      <OrderManagementTable orders={orders} onStatusChange={handleStatusChange} />
    </main>
  )
}
