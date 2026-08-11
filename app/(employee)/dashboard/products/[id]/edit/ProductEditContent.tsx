'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heading, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { ProductForm, type ProductFormState } from '@/components/forms/ProductForm'
import type { Category } from '@/types'

export function ProductEditContent({ id, backPath = '/dashboard/products' }: { id: string; backPath?: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<ProductFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    Promise.all([
      fetch('/api/categories').then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => (r.ok ? r.json() : null)),
    ]).then(([cats, product]) => {
      setCategories(cats)
      if (product) {
        setForm({
          name: product.name,
          description: product.description ?? '',
          price: product.price,
          categoryIds: product.categories.map((c) => c.id),
          imageUrl: product.imageUrl ?? '',
          slug: product.slug ?? '',
          metaTitle: product.metaTitle ?? '',
          metaDescription: product.metaDescription ?? '',
          ncm: product.ncm ?? '',
          cfop: product.cfop ?? '',
          commercialUnit: product.commercialUnit ?? '',
          gtinEan: product.gtinEan ?? '',
          origin: product.origin ?? '',
          promotionalPrice: product.promotionalPrice ?? 0,
          promotionStartDate: product.promotionStartDate ?? '',
          promotionEndDate: product.promotionEndDate ?? '',
        })
      }
      setLoading(false)
    })
  }, [accessToken, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !form) return
    setSaving(true)
    try {
      const body = {
        ...form,
        active: true,
        ncm: form.ncm || null,
        cfop: form.cfop || null,
        commercialUnit: form.commercialUnit || null,
        gtinEan: form.gtinEan || null,
        origin: form.origin || null,
        promotionalPrice: form.promotionalPrice || null,
        promotionStartDate: form.promotionStartDate || null,
        promotionEndDate: form.promotionEndDate || null,
      }
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ variant: 'success', description: 'Produto atualizado com sucesso.' })
      router.push(backPath)
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao atualizar produto.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div role="status"><Skeleton variant="line" height={40} className="mb-2" /></div>
  if (!form) return <p>Produto não encontrado.</p>

  return (
    <PermissionGuard permissions={['MANAGE_PRODUCTS']}>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href={backPath} className="text-sm text-muted-foreground hover:underline">
            ← Voltar
          </Link>
          <Heading as="h1" size="2xl">Editar Produto</Heading>
          <Link href={`${backPath}/${id}/reviews`} className="text-sm underline">
            Ver avaliações
          </Link>
        </div>
        <ProductForm
          form={form}
          onFormChange={(patch) => setForm((f) => (f ? { ...f, ...patch } : f))}
          categories={categories}
          editingId={id}
          saving={saving}
          onSubmit={handleSubmit}
          accessToken={accessToken}
        />
      </main>
    </PermissionGuard>
  )
}
