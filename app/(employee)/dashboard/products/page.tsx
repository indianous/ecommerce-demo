'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Heading, Table, useToast, type TableColumn } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import type { AdminProductPage, Category, Product, ProductStatus } from '@/types'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function ProductsManagementPage() {
  const { accessToken, user } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()

  const canManageProducts = user?.permissions?.includes('MANAGE_PRODUCTS') ?? false

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('')

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(() => Boolean(accessToken))

  const fetchProducts = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
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
    { key: 'categoryName', header: 'Categoria', render: (p) => p.categoryName },
    { key: 'price', header: 'Preço', render: (p) => formatBRL(p.price) },
    { key: 'stockQuantity', header: 'Estoque', render: (p) => p.stockQuantity },
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
            <Button variant="outline" size="sm" aria-label={`Editar ${p.name}`} onClick={() => router.push(`/dashboard/products/${p.id}/edit`)}>
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
            <Button onClick={() => router.push('/dashboard/products/new')}>Novo produto</Button>
          )}
        </div>

        <div className="flex gap-4 mb-4 flex-wrap">
          <input
            type="search"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-border rounded px-3 py-2 text-sm flex-1 min-w-40"
            aria-label="Buscar produtos"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="border border-border rounded px-3 py-2 text-sm"
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProductStatus | '')}
            className="border border-border rounded px-3 py-2 text-sm"
            aria-label="Filtrar por disponibilidade"
          >
            <option value="">Todos</option>
            <option value="AVAILABLE">Disponível</option>
            <option value="UNAVAILABLE">Indisponível</option>
          </select>
        </div>

        <Table columns={columns} data={products} />
      </main>
    </PermissionGuard>
  )
}
