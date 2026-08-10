'use client'

import { useCallback, useEffect, useState } from 'react'
import { FormField, Heading } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import type { StockLot } from '@/types'

export function ExpiringLotsContent() {
  const { accessToken } = useAuthStore()
  const [lots, setLots] = useState<StockLot[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  const fetchLots = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/stock-lots/expiring?days=${days}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) setLots(await res.json())
    } finally {
      setLoading(false)
    }
  }, [accessToken, days])

  useEffect(() => { fetchLots() }, [fetchLots])

  return (
    <PermissionGuard permissions={['MANAGE_STOCK']}>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-6">Lotes vencendo</Heading>

        <FormField label="Próximos N dias" id="expiring-days">
          <input
            id="expiring-days"
            type="number"
            min={0}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </FormField>

        {loading ? (
          <p className="mt-4">Carregando...</p>
        ) : (
          <table className="w-full text-sm border-collapse mt-4">
            <thead>
              <tr>
                <th className="text-left p-2 border-b">Produto</th>
                <th className="text-left p-2 border-b">Lote</th>
                <th className="text-left p-2 border-b">Saldo</th>
                <th className="text-left p-2 border-b">Validade</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id} className="border-b">
                  <td className="p-2">{lot.productName}</td>
                  <td className="p-2">{lot.lotNumber ?? lot.id.slice(0, 8)}</td>
                  <td className="p-2">{lot.quantity}</td>
                  <td className="p-2">{lot.expiryDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </PermissionGuard>
  )
}
