'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Heading, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import type { AdminProductPage, Product } from '@/types'

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))

export function DeletedProductsContent() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(() => Boolean(accessToken))

  const fetchProducts = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products?active=false', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data: AdminProductPage = await res.json()
        setProducts(data.content)
      }
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { fetchProducts() }, [fetchProducts])

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

  return (
    <PermissionGuard permissions={['RESTORE_PRODUCTS']}>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-6">Produtos Excluídos</Heading>

        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum produto excluído.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 border-b">Nome</th>
                <th className="text-left p-2 border-b">Categoria</th>
                <th className="text-left p-2 border-b">Excluído em</th>
                <th className="text-left p-2 border-b"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">{p.categoryName}</td>
                  <td className="p-2">{formatDate(p.updatedAt)}</td>
                  <td className="p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Restaurar ${p.name}`}
                      onClick={() => handleRestore(p)}
                    >
                      Restaurar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </PermissionGuard>
  )
}
