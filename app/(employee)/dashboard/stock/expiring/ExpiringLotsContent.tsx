'use client'

import { useCallback, useEffect, useState } from 'react'
import { FormField, Heading, Table, type TableColumn, Text } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { sortTableData } from '@/lib/sortTableData'
import type { StockLot } from '@/types'

export function ExpiringLotsContent() {
  const { accessToken } = useAuthStore()
  const [lots, setLots] = useState<StockLot[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

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

  const sortedLots = sort
    ? sortTableData(lots, sort.key as keyof StockLot, sort.direction, sort.key === 'quantity' ? 'number' : sort.key === 'expiryDate' ? 'date' : 'string')
    : lots

  const columns: TableColumn<StockLot>[] = [
    { key: 'productName', header: 'Produto', sortable: true, render: (lot) => lot.productName },
    { key: 'lotNumber', header: 'Lote', render: (lot) => lot.lotNumber ?? lot.id.slice(0, 8) },
    { key: 'quantity', header: 'Saldo', sortable: true, render: (lot) => lot.quantity },
    { key: 'expiryDate', header: 'Validade', sortable: true, render: (lot) => lot.expiryDate },
  ]

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
        ) : lots.length === 0 ? (
          <Text size="sm" color="muted" className="mt-4">Nenhum lote vencendo nesse período.</Text>
        ) : (
          <Table
            columns={columns}
            data={sortedLots}
            onSort={(key, direction) => setSort({ key, direction })}
            className="mt-4"
          />
        )}
      </main>
    </PermissionGuard>
  )
}
