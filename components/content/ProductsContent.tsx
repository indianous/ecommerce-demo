'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Dialog, FilterDropdown, Icon, Table, type TableColumn, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { CategoryForm } from '@/components/forms/CategoryForm'
import { ManagementPageHeader } from '@/components/layout/ManagementPageHeader'
import { ManagementPageBody } from '@/components/layout/ManagementPageBody'
import { ManagementContentHeader } from '@/components/layout/ManagementContentHeader'
import { ManagementContentBody } from '@/components/layout/ManagementContentBody'
import { ManagementContentFooter } from '@/components/layout/ManagementContentFooter'
import { sortTableData } from '@/lib/sortTableData'
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

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)

  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<Product> | null> => {
    if (!accessToken) return null
    params.set('active', 'true')
    if (searchRef.current) params.set('search', searchRef.current)
    categoryIds.forEach((id) => params.append('categoryId', id))
    statusFilter.forEach((s) => params.append('status', s))
    const res = await fetch(`/api/admin/products?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
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

  const handleCategorySave = async () => {
    if (!categoryName.trim() || !accessToken) return
    setCategorySaving(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
          description: '',
        }),
      })
      if (!res.ok) throw new Error()
      const newCategory: Category = await res.json()
      setCategories((prev) => [...prev, newCategory])
      setCategoryName('')
      setCategoryDialogOpen(false)
      toast({ variant: 'success', description: 'Categoria criada com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao criar categoria.' })
    } finally {
      setCategorySaving(false)
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

  const columns: TableColumn<Product>[] = [
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
      <main className="mx-auto max-w-5xl px-4 py-8">
        <ManagementPageHeader title="Gestão de Produtos" />
        <ManagementPageBody
          actions={
            canManageProducts && (
              <>
                <Button iconOnly leftIcon={<Icon name="FolderPlus" size="sm" />} aria-label="Nova categoria" variant="outline" onClick={() => setCategoryDialogOpen(true)} />
                <Button iconOnly leftIcon={<Icon name="Plus" size="sm" />} aria-label="Novo produto" variant="primary" onClick={() => router.push(`${basePath}/new`)} />
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

          <ManagementContentBody loading={loading} empty={products.length === 0} emptyMessage="Nenhum produto encontrado." loadingLabel="Carregando produtos">
            <Table
              columns={columns}
              data={sortedProducts}
              onSort={(key, direction) => setSort({ key, direction })}
            />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={goToPage} />

          <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} title="Nova categoria">
            <CategoryForm name={categoryName} onChange={setCategoryName} onSave={handleCategorySave} saving={categorySaving} />
          </Dialog>
        </ManagementPageBody>
      </main>
    </PermissionGuard>
  )
}
