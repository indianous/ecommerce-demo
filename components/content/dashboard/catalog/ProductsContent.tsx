'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { useRouter } from 'next/navigation'
import { Badge, Button, Container, FilterDropdown, Icon, Table, type TableColumn, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { ProductImportDialog } from '@/components/product/ProductImportDialog'
import { downloadBlob } from '@/lib/downloadBlob'
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
import type { Category, Product } from '@/types'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function ProductsContent({ basePath = '/dashboard/products' }: { basePath?: string }) {
  const { accessToken, user } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()

  const canManageProducts =
    user?.role === 'ADMIN' || (user?.permissions?.includes('MANAGE_PRODUCTS') ?? false)

  const searchRef = useRef('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])

  const [categories, setCategories] = useState<Category[]>([])


  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<Product> | null> => {
    if (!accessToken) return null
    params.set('active', 'true')
    if (searchRef.current) params.set('search', searchRef.current)
    categoryIds.forEach((id) => params.append('categoryId', id))
    statusFilter.forEach((s) => params.append('status', s))
    const res = await authFetch(`/api/admin/products?${params}`)
    if (!res.ok) return null
    return await res.json()
  }, [accessToken, categoryIds, statusFilter])

  const { page, items: products, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/categories').then((r) => (r.ok ? r.json() : [])).then(setCategories)
  }, [accessToken])

  const handleExport = async () => {
    if (!accessToken) return
    setExporting(true)
    try {
      const res = await fetch('/api/admin/products/export', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      downloadBlob(blob, 'produtos.csv')
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao exportar produtos.' })
    } finally {
      setExporting(false)
    }
  }

  const sortedProducts = sort
    ? sortTableData(
        products,
        sort.key as keyof Product,
        sort.direction,
        sort.key === 'name' ? 'string' : 'number',
      )
    : products

  const selection = useRowSelection()

  const columns: TableColumn<Product>[] = [
    makeSelectionColumn(sortedProducts, (p) => p.id, (p) => p.name, selection.selectedIds, selection.toggle, selection.selectAll),
    { key: 'name', header: 'Nome', sortable: true, render: (p) => p.name },
    { key: 'categoryName', header: 'Categoria', render: (p) => p.categories[0]?.name ?? '—' },
    { key: 'price', header: 'Preço', sortable: true, render: (p) => formatBRL(p.price) },
    { key: 'stockQuantity', header: 'Estoque', sortable: true, render: (p) => p.stockQuantity },
    { key: 'viewCount', header: 'Visualizações', sortable: true, render: (p) => p.viewCount ?? 0 },
    {
      key: 'soldQuantityLast30Days',
      header: 'Vendidos (30d)',
      sortable: true,
      render: (p) => p.soldQuantityLast30Days ?? 0,
    },
    {
      key: 'status',
      header: 'Disponibilidade',
      render: (p) => (
        <Badge variant={p.status === 'AVAILABLE' ? 'success' : 'default'}>
          {p.status === 'AVAILABLE' ? 'Disponível' : 'Indisponível'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (p) => (
        <div className="flex gap-2 flex-wrap">
          {canManageProducts && (
            <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label={`Editar ${p.name}`} variant="outline" size="sm" onClick={() => router.push(`${basePath}/${p.id}/edit`)} />
          )}
        </div>
      ),
    },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_PRODUCTS']}>
      <Container>
        <ManagementPageHeader title="Gestão de Produtos" />
        <ManagementPageBody
          actions={
            canManageProducts && (
              <>
                <Button leftIcon={<Icon name="Download" size="sm" />} variant="outline" isLoading={exporting} onClick={handleExport}>Exportar CSV</Button>
                <Button leftIcon={<Icon name="Upload" size="sm" />} variant="outline" onClick={() => setImportDialogOpen(true)}>Importar CSV</Button>
                <Button leftIcon={<Icon name="Plus" size="sm" />} variant="primary" onClick={() => router.push(`${basePath}/new`)}>Novo produto</Button>
              </>
            )
          }
        >
          <ManagementContentHeader
            searchId="products-search"
            searchLabel="Buscar produtos"
            searchPlaceholder="Buscar por nome, id ou código..."
            onSearch={handleSearch}
            filters={
              <>
                <FilterDropdown
                  label="Categoria"
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  value={categoryIds}
                  onApply={setCategoryIds}
                />
                <FilterDropdown
                  label="Disponibilidade"
                  options={[
                    { value: 'AVAILABLE', label: 'Disponível' },
                    { value: 'UNAVAILABLE', label: 'Indisponível' },
                  ]}
                  value={statusFilter}
                  onApply={setStatusFilter}
                />
              </>
            }
          />

          <SelectionBar selectedCount={selection.selectedCount} onClear={selection.clear} />

          <ManagementContentBody loading={loading} empty={products.length === 0} emptyMessage="Nenhum produto encontrado." loadingLabel="Carregando produtos">
            <Table
              columns={columns}
              data={sortedProducts}
              onSort={(key, direction) => setSort({ key, direction })}
            />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={(p) => { goToPage(p); selection.clear() }} />


          <ProductImportDialog
            open={importDialogOpen}
            onClose={() => setImportDialogOpen(false)}
            onImported={reload}
          />
        </ManagementPageBody>
      </Container>
    </PermissionGuard>
  )
}
