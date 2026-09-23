'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import Link from 'next/link'
import { Container, FilterDropdown, FormField, Table, type TableColumn } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { ManagementPageHeader } from '@/components/layout/ManagementPageHeader'
import { ManagementPageBody } from '@/components/layout/ManagementPageBody'
import { ManagementContentHeader } from '@/components/layout/ManagementContentHeader'
import { ManagementContentBody } from '@/components/layout/ManagementContentBody'
import { ManagementContentFooter } from '@/components/layout/ManagementContentFooter'
import { SelectionBar } from '@/components/layout/SelectionBar'
import { makeSelectionColumn } from '@/components/layout/selectionColumn'
import { sortTableData } from '@/lib/sortTableData'
import { useRowSelection } from '@/lib/useRowSelection'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { StockMovement } from '@/types'

interface Props {
  productId: string
  stockBasePath?: string
}

const REASON_OPTIONS = [
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
  const [reason, setReason] = useState<string[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const searchRef = useRef('')
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  useEffect(() => {
    if (!accessToken) return
    authFetch(`/api/admin/products/${productId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setProductName(data.name) })
      .catch(() => {})
  }, [accessToken, productId])

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<StockMovement> | null> => {
    if (!accessToken) return null
    reason.forEach((r) => params.append('reason', r))
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (searchRef.current) params.set('search', searchRef.current)
    const res = await authFetch(`/api/admin/products/${productId}/stock-movements?${params.toString()}`)
    if (!res.ok) return null
    return await res.json()
  }, [accessToken, productId, reason, from, to])

  const { page, items: movements, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const sortedMovements = sort
    ? sortTableData(movements, sort.key as keyof StockMovement, sort.direction, sort.key === 'quantity' ? 'number' : sort.key === 'createdAt' ? 'date' : 'string')
    : movements

  const selection = useRowSelection()

  const columns: TableColumn<StockMovement>[] = [
    makeSelectionColumn(sortedMovements, (m) => m.id, (m) => `movimentação ${m.type} #${m.id.slice(0, 8)}`, selection.selectedIds, selection.toggle, selection.selectAll),
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
      <Container>
        <Link href={stockBasePath} className="text-sm underline">← Voltar</Link>
        <div className="mt-4">
          <ManagementPageHeader title={`Histórico de estoque${productName ? ` — ${productName}` : ''}`} />
        </div>
        <ManagementPageBody>
          <ManagementContentHeader
            searchId="stock-history-search"
            searchLabel="Buscar movimentações"
            searchPlaceholder="Buscar por lote ou quem fez..."
            onSearch={handleSearch}
            filters={
              <>
                <FilterDropdown
                  label="Motivo"
                  options={REASON_OPTIONS}
                  value={reason}
                  onApply={setReason}
                />
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
              </>
            }
          />

          <SelectionBar selectedCount={selection.selectedCount} onClear={selection.clear} />

          <ManagementContentBody loading={loading} empty={movements.length === 0} emptyMessage="Nenhuma movimentação encontrada." loadingLabel="Carregando movimentações">
            <Table
              columns={columns}
              data={sortedMovements}
              onSort={(key, direction) => setSort({ key, direction })}
            />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={(p) => { goToPage(p); selection.clear() }} />
        </ManagementPageBody>
      </Container>
    </PermissionGuard>
  )
}
