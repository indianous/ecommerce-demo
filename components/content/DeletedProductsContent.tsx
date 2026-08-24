'use client'

import { useCallback, useState } from 'react'
import { Button, Heading, Icon, Table, type TableColumn, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { PaginationBar } from '@/components/ui/PaginationBar'
import { sortTableData } from '@/lib/sortTableData'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { Product } from '@/types'

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))

export function DeletedProductsContent() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<Product> | null> => {
    if (!accessToken) return null
    params.set('active', 'false')
    const res = await fetch(`/api/admin/products?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return await res.json()
  }, [accessToken])

  const { page, items: products, setItems: setProducts, totalPages, loading, goToPage } = usePaginatedFetch(fetchPage)

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

  if (loading) return <main className="px-4 py-8"><p>Carregando produtos excluídos...</p></main>

  const sortedProducts = sort ? sortTableData(products, sort.key as keyof Product, sort.direction, sort.key === 'updatedAt' ? 'date' : 'string') : products

  const columns: TableColumn<Product>[] = [
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
        <Heading as="h1" size="2xl" className="mb-6">Produtos Excluídos</Heading>

        {products.length === 0 ? (
          <Text size="sm" color="muted">Nenhum produto excluído.</Text>
        ) : (
          <>
            <Table columns={columns} data={sortedProducts} onSort={(key, direction) => setSort({ key, direction })} />
            <PaginationBar page={page} totalPages={totalPages} onPageChange={goToPage} className="mt-4" />
          </>
        )}
      </main>
    </PermissionGuard>
  )
}
