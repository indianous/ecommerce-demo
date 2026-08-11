'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Dialog, FormField, Heading, Input, Select, Table, useToast, type TableColumn } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { CategoryForm } from '@/components/forms/CategoryForm'
import type { AdminProductPage, Category, Product, ProductStatus } from '@/types'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function ProductsContent({ basePath = '/dashboard/products' }: { basePath?: string }) {
  const { accessToken, user } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()

  const canManageProducts =
    user?.role === 'ADMIN' || (user?.permissions?.includes('MANAGE_PRODUCTS') ?? false)

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('')

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(() => Boolean(accessToken))

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)

  const fetchProducts = useCallback(async () => {
    if (!accessToken) return
    try {
      const params = new URLSearchParams({ active: 'true' })
      if (search) params.set('search', search)
      if (categoryId) params.set('categoryId', categoryId)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/admin/products?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data: AdminProductPage = await res.json()
        setProducts(data.content)
      }
    } finally {
      setLoading(false)
    }
  }, [accessToken, search, categoryId, statusFilter])

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/categories').then((r) => (r.ok ? r.json() : [])).then(setCategories)
  }, [accessToken])

  useEffect(() => { fetchProducts() }, [fetchProducts])

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

  const handleDelete = async (product: Product) => {
    if (!accessToken) return
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao excluir produto.' })
    }
  }

  const handleToggleStatus = async (product: Product) => {
    if (!accessToken) return
    const newStatus: ProductStatus = product.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE'
    try {
      const res = await fetch(`/api/admin/products/${product.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      const updated: Product = await res.json()
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)))
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao atualizar disponibilidade.' })
    }
  }

  if (loading) return <main className="px-4 py-8"><p>Carregando produtos...</p></main>

  const columns: TableColumn<Product>[] = [
    { key: 'name', header: 'Nome', render: (p) => p.name },
    { key: 'categoryName', header: 'Categoria', render: (p) => p.categories[0]?.name ?? '—' },
    { key: 'price', header: 'Preço', render: (p) => formatBRL(p.price) },
    { key: 'stockQuantity', header: 'Estoque', render: (p) => p.stockQuantity },
    { key: 'viewCount', header: 'Visualizações', render: (p) => p.viewCount ?? 0 },
    { key: 'soldQuantityLast30Days', header: 'Vendidos (30d)', render: (p) => p.soldQuantityLast30Days ?? 0 },
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
            <Button variant="outline" size="sm" aria-label={`Editar ${p.name}`} onClick={() => router.push(`${basePath}/${p.id}/edit`)}>
              Editar
            </Button>
          )}
          {canManageProducts && (
            <Button
              variant="outline"
              size="sm"
              aria-label={p.status === 'AVAILABLE' ? `Tornar Indisponível ${p.name}` : `Tornar Disponível ${p.name}`}
              onClick={() => handleToggleStatus(p)}
            >
              {p.status === 'AVAILABLE' ? 'Tornar Indisponível' : 'Tornar Disponível'}
            </Button>
          )}
          {canManageProducts && (
            <Button variant="danger" size="sm" aria-label={`Excluir ${p.name}`} onClick={() => handleDelete(p)}>
              Excluir
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_PRODUCTS']}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Heading as="h1" size="2xl">Gestão de Produtos</Heading>
          {canManageProducts && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>Nova categoria</Button>
              <Button onClick={() => router.push(`${basePath}/new`)}>Novo produto</Button>
            </div>
          )}
        </div>

        <div className="flex gap-4 mb-4 flex-wrap items-start">
          <FormField label="Buscar produtos" id="products-search" className="flex-1 min-w-40">
            <Input
              id="products-search"
              type="search"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FormField>
          <FormField label="Filtrar por categoria" id="products-category-filter">
            <Select
              id="products-category-filter"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: '', label: 'Todas as categorias' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </FormField>
          <FormField label="Filtrar por disponibilidade" id="products-status-filter">
            <Select
              id="products-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProductStatus | '')}
              options={[
                { value: '', label: 'Todos' },
                { value: 'AVAILABLE', label: 'Disponível' },
                { value: 'UNAVAILABLE', label: 'Indisponível' },
              ]}
            />
          </FormField>
        </div>

        <Table columns={columns} data={products} />

        <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} title="Nova categoria">
          <CategoryForm name={categoryName} onChange={setCategoryName} onSave={handleCategorySave} saving={categorySaving} />
        </Dialog>
      </main>
    </PermissionGuard>
  )
}
