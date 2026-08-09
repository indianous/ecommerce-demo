'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Heading, Input, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import type { AdminProductPage, Product } from '@/types'

export function StockContent() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(() => Boolean(accessToken))
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [savingStockIds, setSavingStockIds] = useState<Set<string>>(new Set())

  const fetchProducts = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products?active=true', {
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

  useEffect(() => {
    const map: Record<string, number> = {}
    for (const p of products) map[p.id] = p.stockQuantity
    setStockMap(map)
  }, [products])

  const handleSaveStock = async (productId: string) => {
    if (!accessToken) return
    setSavingStockIds((s) => new Set([...s, productId]))
    try {
      const res = await fetch(`/api/admin/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ quantity: stockMap[productId] }),
      })
      if (!res.ok) throw new Error()
      toast({ variant: 'success', description: 'Estoque atualizado.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao atualizar estoque.' })
    } finally {
      setSavingStockIds((s) => { const n = new Set(s); n.delete(productId); return n })
    }
  }

  if (loading) return <main className="px-4 py-8"><p>Carregando produtos...</p></main>

  return (
    <PermissionGuard permissions={['MANAGE_STOCK']}>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-6">Gestão de Estoque</Heading>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 border-b">Produto</th>
              <th className="text-left p-2 border-b">Categoria</th>
              <th className="text-left p-2 border-b">Quantidade</th>
              <th className="text-left p-2 border-b"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.categoryName}</td>
                <td className="p-2">
                  <Input
                    id={`stock-quantity-${p.id}`}
                    type="number"
                    aria-label={`Quantidade ${p.name}`}
                    value={stockMap[p.id] ?? p.stockQuantity}
                    min={0}
                    onChange={(e) => setStockMap((m) => ({ ...m, [p.id]: Number(e.target.value) }))}
                    className="w-24"
                  />
                </td>
                <td className="p-2">
                  <Button
                    size="sm"
                    aria-label={`Salvar estoque ${p.name}`}
                    disabled={savingStockIds.has(p.id)}
                    onClick={() => handleSaveStock(p.id)}
                  >
                    Salvar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </PermissionGuard>
  )
}
