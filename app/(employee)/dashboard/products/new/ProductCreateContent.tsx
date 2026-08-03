'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heading, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { ProductForm, EMPTY_PRODUCT_FORM, type ProductFormState } from '@/components/forms/ProductForm'
import type { Category } from '@/types'

export function ProductCreateContent() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/categories').then((r) => r.ok ? r.json() : []).then(setCategories)
  }, [accessToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return
    setSaving(true)
    try {
      const category = categories.find((c) => c.id === form.categoryId)
      const body = { ...form, categoryName: category?.name ?? '', active: true }
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ variant: 'success', description: 'Produto criado com sucesso.' })
      router.push('/dashboard/products')
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao criar produto.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PermissionGuard permissions={['MANAGE_PRODUCTS']}>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard/products" className="text-sm text-muted-foreground hover:underline">
            ← Voltar
          </Link>
          <Heading as="h1" size="2xl">Novo Produto</Heading>
        </div>
        <ProductForm
          form={form}
          onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          categories={categories}
          editingId={null}
          saving={saving}
          onSubmit={handleSubmit}
          accessToken={accessToken}
        />
      </main>
    </PermissionGuard>
  )
}
