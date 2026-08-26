'use client'

import { useCallback, useRef, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import Link from 'next/link'
import { Button, Dialog, Icon, Table, type TableColumn, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { StockEntryForm } from '@/components/forms/StockEntryForm'
import { StockExitForm } from '@/components/forms/StockExitForm'
import { ManagementPageHeader } from '@/components/layout/ManagementPageHeader'
import { ManagementPageBody } from '@/components/layout/ManagementPageBody'
import { ManagementContentHeader } from '@/components/layout/ManagementContentHeader'
import { ManagementContentBody } from '@/components/layout/ManagementContentBody'
import { ManagementContentFooter } from '@/components/layout/ManagementContentFooter'
import { sortTableData } from '@/lib/sortTableData'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { Product, StockLot, StockLotPage, StockMovementReason } from '@/types'

interface Props {
  stockBasePath?: string
}

export function StockContent({ stockBasePath = '/dashboard/stock' }: Props) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const searchRef = useRef('')

  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const [entryProductId, setEntryProductId] = useState<string | null>(null)
  const [entryReason, setEntryReason] = useState<StockMovementReason>('PURCHASE')
  const [entryQuantity, setEntryQuantity] = useState(1)
  const [entryNote, setEntryNote] = useState('')
  const [entryLotNumber, setEntryLotNumber] = useState('')
  const [entryExpiryDate, setEntryExpiryDate] = useState('')
  const [entrySaving, setEntrySaving] = useState(false)

  const [exitProductId, setExitProductId] = useState<string | null>(null)
  const [exitLots, setExitLots] = useState<StockLot[]>([])
  const [exitReason, setExitReason] = useState<StockMovementReason>('LOSS_DAMAGE')
  const [exitLotId, setExitLotId] = useState('')
  const [exitQuantity, setExitQuantity] = useState(1)
  const [exitNote, setExitNote] = useState('')
  const [exitSaving, setExitSaving] = useState(false)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<Product> | null> => {
    if (!accessToken) return null
    params.set('active', 'true')
    if (searchRef.current) params.set('search', searchRef.current)
    const res = await authFetch(`/api/admin/products?${params}`)
    if (!res.ok) return null
    return await res.json()
  }, [accessToken])

  const { page, items: products, totalPages, loading, goToPage, reload, refetch } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const openEntryDialog = (productId: string) => {
    setEntryReason('PURCHASE')
    setEntryQuantity(1)
    setEntryNote('')
    setEntryLotNumber('')
    setEntryExpiryDate('')
    setEntryProductId(productId)
  }

  const closeEntryDialog = () => setEntryProductId(null)

  const handleEntrySave = async () => {
    if (!accessToken || !entryProductId) return
    setEntrySaving(true)
    try {
      const res = await authFetch(`/api/admin/products/${entryProductId}/stock-movements/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: entryReason,
          quantity: entryQuantity,
          note: entryNote || undefined,
          lotNumber: entryLotNumber || undefined,
          expiryDate: entryExpiryDate || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast({ variant: 'destructive', description: data?.message ?? 'Erro ao registrar entrada.' })
        return
      }
      closeEntryDialog()
      toast({ variant: 'success', description: 'Entrada registrada com sucesso.' })
      refetch()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao registrar entrada.' })
    } finally {
      setEntrySaving(false)
    }
  }

  const openExitDialog = async (productId: string) => {
    if (!accessToken) return
    setExitReason('LOSS_DAMAGE')
    setExitLotId('')
    setExitQuantity(1)
    setExitNote('')
    setExitLots([])
    setExitProductId(productId)
    const res = await authFetch(`/api/admin/products/${productId}/stock-lots`)
    if (res.ok) {
      const data: StockLotPage = await res.json()
      setExitLots((data.content ?? []).filter((lot) => lot.quantity > 0))
    }
  }

  const closeExitDialog = () => setExitProductId(null)

  const handleExitSave = async () => {
    if (!accessToken || !exitProductId) return
    setExitSaving(true)
    try {
      const res = await authFetch(`/api/admin/products/${exitProductId}/stock-movements/exits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: exitReason,
          lotId: exitLotId,
          quantity: exitQuantity,
          note: exitNote || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast({ variant: 'destructive', description: data?.message ?? 'Erro ao registrar saída.' })
        return
      }
      closeExitDialog()
      toast({ variant: 'success', description: 'Saída registrada com sucesso.' })
      refetch()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao registrar saída.' })
    } finally {
      setExitSaving(false)
    }
  }

  const sortedProducts = sort ? sortTableData(products, sort.key as keyof Product, sort.direction, sort.key === 'stockQuantity' ? 'number' : 'string') : products

  const columns: TableColumn<Product>[] = [
    { key: 'name', header: 'Produto', sortable: true, render: (p) => p.name },
    { key: 'categoryName', header: 'Categoria', render: (p) => p.categories[0]?.name },
    { key: 'stockQuantity', header: 'Quantidade', sortable: true, render: (p) => p.stockQuantity },
    {
      key: 'actions',
      header: 'Ações',
      render: (p) => (
        <div className="flex items-center gap-3">
          <Button iconOnly leftIcon={<Icon name="ArrowDownToLine" size="sm" />} aria-label="Entrada" variant="primary" size="sm" onClick={() => openEntryDialog(p.id)} />
          <Button iconOnly leftIcon={<Icon name="ArrowUpFromLine" size="sm" />} aria-label="Saída" variant="outline" size="sm" onClick={() => openExitDialog(p.id)} />
          <Link href={`${stockBasePath}/${p.id}`} className="text-sm underline">Histórico</Link>
        </div>
      ),
    },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_STOCK']}>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <ManagementPageHeader title="Gestão de Estoque" />
        <ManagementPageBody
          actions={
            <Link href={`${stockBasePath}/expiring`} className="text-sm underline self-center">
              Lotes vencendo
            </Link>
          }
        >
          <ManagementContentHeader
            searchId="stock-search"
            searchLabel="Buscar produtos"
            searchPlaceholder="Buscar por nome, id ou código..."
            onSearch={handleSearch}
          />

          <ManagementContentBody loading={loading} empty={products.length === 0} emptyMessage="Nenhum produto encontrado." loadingLabel="Carregando produtos">
            <Table
              columns={columns}
              data={sortedProducts}
              onSort={(key, direction) => setSort({ key, direction })}
            />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={goToPage} />
        </ManagementPageBody>
      </main>

      <Dialog open={entryProductId !== null} onClose={closeEntryDialog} title="Registrar entrada">
        <StockEntryForm
          reason={entryReason}
          quantity={entryQuantity}
          note={entryNote}
          lotNumber={entryLotNumber}
          expiryDate={entryExpiryDate}
          onReason={setEntryReason}
          onQuantity={setEntryQuantity}
          onNote={setEntryNote}
          onLotNumber={setEntryLotNumber}
          onExpiryDate={setEntryExpiryDate}
          onSave={handleEntrySave}
          saving={entrySaving}
        />
      </Dialog>

      <Dialog open={exitProductId !== null} onClose={closeExitDialog} title="Registrar saída">
        <StockExitForm
          lots={exitLots}
          reason={exitReason}
          lotId={exitLotId}
          quantity={exitQuantity}
          note={exitNote}
          onReason={setExitReason}
          onLotId={setExitLotId}
          onQuantity={setExitQuantity}
          onNote={setExitNote}
          onSave={handleExitSave}
          saving={exitSaving}
        />
      </Dialog>
    </PermissionGuard>
  )
}
