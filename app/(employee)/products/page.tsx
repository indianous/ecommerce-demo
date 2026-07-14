'use client'

import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  FileUpload,
  FormField,
  Heading,
  Input,
  NumberInput,
  Select,
  Table,
  useToast,
  type TableColumn,
} from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import type { Category, Product } from '@/types'

type ProductFormState = {
  name: string
  description: string
  price: number
  stockQuantity: number
  categoryId: string
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  description: '',
  price: 0,
  stockQuantity: 0,
  categoryId: '',
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function ProductsManagementPage() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(() => Boolean(accessToken))

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    Promise.all([
      fetch('/api/admin/products', { headers: { Authorization: `Bearer ${accessToken}` } }).then((res) =>
        res.ok ? res.json() : [],
      ),
      fetch('/api/categories').then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([productsData, categoriesData]) => {
        setProducts(productsData)
        setCategories(categoriesData)
      })
      .finally(() => setLoading(false))
  }, [accessToken])

  const openCreateDialog = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      stockQuantity: product.stockQuantity,
      categoryId: product.categoryId,
    })
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return
    setSaving(true)
    try {
      const category = categories.find((c) => c.id === form.categoryId)
      const body = { ...form, categoryName: category?.name ?? '', active: true }

      const res = editingId
        ? await fetch(`/api/admin/products/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify(body),
          })
        : await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify(body),
          })

      if (!res.ok) throw new Error()
      const saved: Product = await res.json()

      setProducts((prev) =>
        editingId ? prev.map((p) => (p.id === editingId ? saved : p)) : [...prev, saved],
      )
      setDialogOpen(false)
      toast({ variant: 'success', description: 'Produto salvo com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar produto.' })
    } finally {
      setSaving(false)
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

  if (loading) return <main className="px-4 py-8"><p>Carregando produtos...</p></main>

  const columns: TableColumn<Product>[] = [
    { key: 'name', header: 'Nome', render: (p) => p.name },
    { key: 'categoryName', header: 'Categoria', render: (p) => p.categoryName },
    { key: 'price', header: 'Preço', render: (p) => formatBRL(p.price) },
    { key: 'stockQuantity', header: 'Estoque', render: (p) => p.stockQuantity },
    {
      key: 'active',
      header: 'Status',
      render: (p) => <Badge variant={p.active ? 'success' : 'default'}>{p.active ? 'Ativo' : 'Inativo'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (p) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" aria-label={`Editar ${p.name}`} onClick={() => openEditDialog(p)}>
            Editar
          </Button>
          <Button variant="danger" size="sm" aria-label={`Excluir ${p.name}`} onClick={() => handleDelete(p)}>
            Excluir
          </Button>
        </div>
      ),
    },
  ]

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Heading as="h1" size="2xl">
          Gestão de Produtos
        </Heading>
        <Button onClick={openCreateDialog}>Novo produto</Button>
      </div>

      <Table columns={columns} data={products} />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? 'Editar produto' : 'Novo produto'}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <FormField label="Nome" id="product-name">
            <Input id="product-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </FormField>

          <FormField label="Descrição" id="product-description">
            <Input
              id="product-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </FormField>

          <FormField label="Categoria" id="product-category">
            <Select
              id="product-category"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              placeholder="Selecione uma categoria"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
          </FormField>

          <FormField label="Preço" id="product-price">
            <NumberInput
              id="product-price"
              value={form.price}
              min={0}
              step={0.01}
              onChange={(value) => setForm((f) => ({ ...f, price: value }))}
            />
          </FormField>

          <FormField label="Estoque" id="product-stock">
            <NumberInput
              id="product-stock"
              value={form.stockQuantity}
              min={0}
              onChange={(value) => setForm((f) => ({ ...f, stockQuantity: value }))}
            />
          </FormField>

          {/*
            base-ds's FileUpload has no companion upload endpoint anywhere in this
            codebase yet, so it only collects a File locally — it's not wired to
            persist an image. Flagging instead of inventing an upload API.
          */}
          <FormField label="Imagem" id="product-image">
            <FileUpload accept="image/*" />
          </FormField>

          <Button type="submit" isLoading={saving} className="self-start">
            Salvar
          </Button>
        </form>
      </Dialog>
    </main>
  )
}
