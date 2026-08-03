'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Heading, NumberInput, FormField, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'

export function ProductStockContent({ id }: { id: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const [productName, setProductName] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    fetch(`/api/admin/products/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p) {
          setProductName(p.name)
          setQuantity(p.stockQuantity)
        }
        setLoading(false)
      })
  }, [accessToken, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/products/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ quantity }),
      })
      if (!res.ok) throw new Error()
      toast({ variant: 'success', description: 'Estoque atualizado com sucesso.' })
      router.push('/dashboard/products')
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao atualizar estoque.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div role="status"><Skeleton variant="line" height={40} className="mb-2" /></div>
  if (!productName) return <p>Produto não encontrado.</p>

  return (
    <PermissionGuard permissions={['MANAGE_STOCK']}>
      <main className="mx-auto max-w-md px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard/products" className="text-sm text-muted-foreground hover:underline">
            ← Voltar
          </Link>
          <Heading as="h1" size="2xl">Atualizar Estoque</Heading>
        </div>

        <p className="text-sm text-muted-foreground mb-6">{productName}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Quantidade em estoque" id="stock-quantity">
            <NumberInput
              id="stock-quantity"
              value={quantity}
              min={0}
              onChange={(v) => setQuantity(v)}
            />
          </FormField>

          <Button type="submit" isLoading={saving} className="self-start">
            Salvar
          </Button>
        </form>
      </main>
    </PermissionGuard>
  )
}
