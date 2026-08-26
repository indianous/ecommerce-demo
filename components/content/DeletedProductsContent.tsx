'use client'

import { useCallback, useRef, useState } from 'react'
import { Button, Icon, Table, type TableColumn, useToast } from 'base-ds'
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
import type { Product } from '@/types'

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))

export function DeletedProductsContent() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const searchRef = useRef('')

  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<Product> | null> => {
    if (!accessToken) return null
    params.set('active', 'false')
    if (searchRef.current) params.set('search', searchRef.current)
    const res = await fetch(`/api/admin/products?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return await res.json()
  }, [accessToken])

  const { page, items: products, setItems: setProducts, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const handleRestore = async (product: Product) => {
    if (!accessToken) return
    try {
      const res = await fetch(`/api/admin/products/${product.id}/restore`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
      toast({ variant: 'success', description: 'Produto restaurado.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao restaurar produto.' })
    }
  }

  const sortedProducts = sort ? sortTableData(products, sort.key as keyof Product, sort.direction, sort.key === 'updatedAt' ? 'date' : 'string') : products

  const selection = useRowSelection()

  const columns: TableColumn<Product>[] = [
    makeSelectionColumn(sortedProducts, (p) => p.id, (p) => p.name, selection.selectedIds, selection.toggle, selection.selectAll),
    { key: 'name', header: 'Nome', sortable: true, render: (p) => p.name },
    { key: 'categoryName', header: 'Categoria', render: (p) => p.categories[0]?.name },
    { key: 'updatedAt', header: 'Excluído em', sortable: true, render: (p) => formatDate(p.updatedAt) },
    {
      key: 'actions',
      header: 'Ações',
      render: (p) => (
        <Button iconOnly leftIcon={<Icon name="Undo2" size="sm" />} aria-label={`Restaurar ${p.name}`} variant="outline" size="sm" onClick={() => handleRestore(p)} />
      ),
    },
  ]

  return (
    <PermissionGuard permissions={['RESTORE_PRODUCTS']}>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ManagementPageHeader title="Produtos Excluídos" />
        <ManagementPageBody>
          <ManagementContentHeader
            searchId="deleted-products-search"
            searchLabel="Buscar produtos excluídos"
            searchPlaceholder="Buscar por nome, id ou código..."
            onSearch={handleSearch}
          />

          <SelectionBar selectedCount={selection.selectedCount} onClear={selection.clear} />

          <ManagementContentBody loading={loading} empty={products.length === 0} emptyMessage="Nenhum produto excluído." loadingLabel="Carregando produtos excluídos">
            <Table columns={columns} data={sortedProducts} onSort={(key, direction) => setSort({ key, direction })} />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={(p) => { goToPage(p); selection.clear() }} />
        </ManagementPageBody>
      </main>
    </PermissionGuard>
  )
}
