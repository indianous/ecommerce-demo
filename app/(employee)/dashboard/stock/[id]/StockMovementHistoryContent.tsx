'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { FormField, Heading, Select, Table, type TableColumn, Text } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { sortTableData } from '@/lib/sortTableData'
import type { StockMovement, StockMovementPage, StockMovementReason } from '@/types'

interface Props {
  productId: string
  stockBasePath?: string
}

const REASON_OPTIONS: { value: StockMovementReason | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'PURCHASE', label: 'Compra' },
  { value: 'RETURN', label: 'Devolução' },
  { value: 'ADJUSTMENT', label: 'Ajuste' },
  { value: 'LOSS_DAMAGE', label: 'Perda/Avaria' },
  { value: 'SALE', label: 'Venda' },
  { value: 'OTHER', label: 'Outro' },
]

export function StockMovementHistoryContent({ productId, stockBasePath = '/dashboard/stock' }: Props) {
  const { accessToken } = useAuthStore()
  const [productName, setProductName] = useState('')
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [reason, setReason] = useState<StockMovementReason | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  useEffect(() => {
    if (!accessToken) return
    fetch(`/api/admin/products/${productId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setProductName(data.name) })
      .catch(() => {})
  }, [accessToken, productId])

  const fetchMovements = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (reason) params.set('reason', reason)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/admin/products/${productId}/stock-movements?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data: StockMovementPage = await res.json()
        setMovements(data.content)
      }
    } finally {
      setLoading(false)
    }
  }, [accessToken, productId, reason, from, to])

  useEffect(() => { fetchMovements() }, [fetchMovements])

  const sortedMovements = sort
    ? sortTableData(movements, sort.key as keyof StockMovement, sort.direction, sort.key === 'quantity' ? 'number' : sort.key === 'createdAt' ? 'date' : 'string')
    : movements

  const columns: TableColumn<StockMovement>[] = [
    { key: 'type', header: 'Tipo', render: (m) => m.type },
    { key: 'reason', header: 'Motivo', render: (m) => m.reason },
    { key: 'quantity', header: 'Quantidade', sortable: true, render: (m) => m.quantity },
    { key: 'beforeAfter', header: 'Antes → Depois', render: (m) => `${m.quantityBefore} → ${m.quantityAfter}` },
    {
      key: 'lot',
      header: 'Lote',
      render: (m) => (
        <>
          {m.lotNumber ?? m.lotId.slice(0, 8)}
          {m.lotExpiryDate ? ` (vence ${m.lotExpiryDate})` : ''}
        </>
      ),
    },
    { key: 'actorEmail', header: 'Quem', render: (m) => m.actorEmail ?? '—' },
    { key: 'createdAt', header: 'Quando', sortable: true, render: (m) => new Date(m.createdAt).toLocaleString('pt-BR') },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_STOCK']}>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href={stockBasePath} className="text-sm underline">← Voltar</Link>
        <Heading as="h1" size="2xl" className="my-4">
          Histórico de estoque{productName && ` — ${productName}`}
        </Heading>

        <div className="flex gap-4 mb-4">
          <FormField label="Motivo" id="history-reason">
            <Select
              id="history-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as StockMovementReason | '')}
              options={REASON_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </FormField>
          <FormField label="De" id="history-from">
            <input
              id="history-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FormField>
          <FormField label="Até" id="history-to">
            <input
              id="history-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FormField>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : movements.length === 0 ? (
          <Text size="sm" color="muted">Nenhuma movimentação encontrada.</Text>
        ) : (
          <Table
            columns={columns}
            data={sortedMovements}
            onSort={(key, direction) => setSort({ key, direction })}
          />
        )}
      </main>
    </PermissionGuard>
  )
}
