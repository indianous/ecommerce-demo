'use client'

import { useCallback, useRef, useState } from 'react'
import { FormField, Table, type TableColumn } from 'base-ds'
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
import type { StockLot } from '@/types'

export function ExpiringLotsContent() {
  const { accessToken } = useAuthStore()
  const [days, setDays] = useState(30)
  const searchRef = useRef('')
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<StockLot> | null> => {
    if (!accessToken) return null
    params.set('days', String(days))
    if (searchRef.current) params.set('search', searchRef.current)
    const res = await fetch(`/api/admin/stock-lots/expiring?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return await res.json()
  }, [accessToken, days])

  const { page, items: lots, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const sortedLots = sort
    ? sortTableData(lots, sort.key as keyof StockLot, sort.direction, sort.key === 'quantity' ? 'number' : sort.key === 'expiryDate' ? 'date' : 'string')
    : lots

  const selection = useRowSelection()

  const columns: TableColumn<StockLot>[] = [
    makeSelectionColumn(sortedLots, (lot) => lot.id, (lot) => `lote ${lot.productName}`, selection.selectedIds, selection.toggle, selection.selectAll),
    { key: 'productName', header: 'Produto', sortable: true, render: (lot) => lot.productName },
    { key: 'lotNumber', header: 'Lote', render: (lot) => lot.lotNumber ?? lot.id.slice(0, 8) },
    { key: 'quantity', header: 'Saldo', sortable: true, render: (lot) => lot.quantity },
    { key: 'expiryDate', header: 'Validade', sortable: true, render: (lot) => lot.expiryDate },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_STOCK']}>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ManagementPageHeader title="Lotes vencendo" />
        <ManagementPageBody>
          <ManagementContentHeader
            searchId="expiring-lots-search"
            searchLabel="Buscar lotes"
            searchPlaceholder="Buscar por lote ou produto..."
            onSearch={handleSearch}
            filters={
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
            }
          />

          <SelectionBar selectedCount={selection.selectedCount} onClear={selection.clear} />

          <ManagementContentBody loading={loading} empty={lots.length === 0} emptyMessage="Nenhum lote vencendo nesse período." loadingLabel="Carregando lotes">
            <Table
              columns={columns}
              data={sortedLots}
              onSort={(key, direction) => setSort({ key, direction })}
            />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={(p) => { goToPage(p); selection.clear() }} />
        </ManagementPageBody>
      </main>
    </PermissionGuard>
  )
}
