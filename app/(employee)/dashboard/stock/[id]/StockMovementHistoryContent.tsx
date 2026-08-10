'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { FormField, Heading, Select } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
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
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 border-b">Tipo</th>
                <th className="text-left p-2 border-b">Motivo</th>
                <th className="text-left p-2 border-b">Quantidade</th>
                <th className="text-left p-2 border-b">Antes → Depois</th>
                <th className="text-left p-2 border-b">Lote</th>
                <th className="text-left p-2 border-b">Quem</th>
                <th className="text-left p-2 border-b">Quando</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="p-2">{m.type}</td>
                  <td className="p-2">{m.reason}</td>
                  <td className="p-2">{m.quantity}</td>
                  <td className="p-2">{m.quantityBefore} → {m.quantityAfter}</td>
                  <td className="p-2">
                    {m.lotNumber ?? m.lotId.slice(0, 8)}
                    {m.lotExpiryDate ? ` (vence ${m.lotExpiryDate})` : ''}
                  </td>
                  <td className="p-2">{m.actorEmail ?? '—'}</td>
                  <td className="p-2">{new Date(m.createdAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </PermissionGuard>
  )
}
