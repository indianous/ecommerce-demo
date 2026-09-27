'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Container, Dialog, Heading, Icon, Skeleton, Table, Text, useToast, type TableColumn } from '@indianous/base-ds'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { CategoryForm, EMPTY_CATEGORY_FORM, type CategoryFormState } from '@/components/forms/CategoryForm'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { authFetch } from '@/lib/authFetch'
import { useConfirmDelete } from '@/lib/useConfirmDelete'
import type { AdminCategory, CategoryInput } from '@/types'

type DialogState = { mode: 'new' } | { mode: 'edit'; category: AdminCategory } | null

function toFormState(category: AdminCategory): CategoryFormState {
  return { name: category.name, slug: category.slug, description: category.description ?? '' }
}

/** Slug em branco não vai no corpo: o backend gera a partir do nome. Descrição em branco vira null. */
function toInput(form: CategoryFormState): CategoryInput {
  const slug = form.slug.trim()
  return {
    name: form.name.trim(),
    ...(slug ? { slug } : {}),
    description: form.description.trim() || null,
  }
}

function productsLabel(count: number) {
  return `${count} ${count === 1 ? 'produto' : 'produtos'}`
}

async function errorMessage(res: Response, fallback: string) {
  const data = await res.json().catch(() => null)
  return (data as { message?: string } | null)?.message ?? fallback
}

export function CategoriesContent() {
  const { toast } = useToast()

  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [form, setForm] = useState<CategoryFormState>(EMPTY_CATEGORY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/categories')
      if (res.ok) setCategories(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchCategories() }, [fetchCategories])

  const closeDialog = () => {
    setDialog(null)
    setForm(EMPTY_CATEGORY_FORM)
  }

  const openNew = () => {
    setForm(EMPTY_CATEGORY_FORM)
    setDialog({ mode: 'new' })
  }

  const openEdit = (category: AdminCategory) => {
    setForm(toFormState(category))
    setDialog({ mode: 'edit', category })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dialog || !form.name.trim()) return
    setSaving(true)
    try {
      const editing = dialog.mode === 'edit'
      const res = await authFetch(editing ? `/api/admin/categories/${dialog.category.id}` : '/api/admin/categories', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toInput(form)),
      })
      if (!res.ok) {
        toast({ variant: 'destructive', description: await errorMessage(res, 'Erro ao salvar categoria.') })
        return
      }
      await fetchCategories()
      closeDialog()
      toast({ variant: 'success', description: editing ? 'Categoria atualizada.' : 'Categoria criada.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar categoria.' })
    } finally {
      setSaving(false)
    }
  }

  const performDelete = async (category: AdminCategory) => {
    const res = await authFetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast({ variant: 'destructive', description: await errorMessage(res, 'Erro ao excluir categoria.') })
      throw new Error()
    }
    setCategories((prev) => prev.filter((c) => c.id !== category.id))
    toast({ variant: 'success', description: 'Categoria excluída.' })
  }

  const {
    target: deleteTarget,
    setTarget: setDeleteTarget,
    deleting,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmDelete(performDelete)

  const columns: TableColumn<AdminCategory>[] = [
    { key: 'name', header: 'Nome', render: (c) => c.name },
    { key: 'slug', header: 'Slug', render: (c) => <Text size="sm" color="muted">{c.slug}</Text> },
    { key: 'productCount', header: 'Produtos', render: (c) => c.productCount },
    {
      key: 'actions',
      header: <span className="sr-only">Ações</span>,
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            iconOnly
            leftIcon={<Icon name="Pencil" size="sm" />}
            aria-label={`Editar ${c.name}`}
            variant="outline"
            size="sm"
            onClick={() => openEdit(c)}
          />
          {c.productCount > 0 ? (
            <Button
              iconOnly
              leftIcon={<Icon name="Trash2" size="sm" />}
              aria-label={`Não é possível excluir ${c.name}: em uso por ${productsLabel(c.productCount)}`}
              variant="danger"
              size="sm"
              disabled
            />
          ) : (
            <Button
              iconOnly
              leftIcon={<Icon name="Trash2" size="sm" />}
              aria-label={`Excluir ${c.name}`}
              variant="danger"
              size="sm"
              onClick={() => setDeleteTarget(c)}
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_PRODUCTS']}>
      <Container>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Heading as="h1" size="2xl">Categorias</Heading>
          <Button leftIcon={<Icon name="FolderPlus" size="sm" />} variant="primary" onClick={openNew}>
            Nova categoria
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2" role="status" aria-label="Carregando categorias">
            <Skeleton variant="line" height={40} />
            <Skeleton variant="line" height={40} />
            <Skeleton variant="line" height={40} />
          </div>
        ) : categories.length === 0 ? (
          <Text color="muted">Nenhuma categoria cadastrada.</Text>
        ) : (
          <Table columns={columns} data={categories} caption="Categorias do catálogo" />
        )}

        <Dialog
          open={dialog !== null}
          onClose={closeDialog}
          title={dialog?.mode === 'edit' ? 'Editar categoria' : 'Nova categoria'}
        >
          <CategoryForm
            form={form}
            onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            onSubmit={handleSubmit}
            saving={saving}
            editing={dialog?.mode === 'edit'}
          />
        </Dialog>

        <ConfirmDeleteDialog
          open={deleteTarget !== null}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          deleting={deleting}
          title="Excluir categoria"
          description={deleteTarget ? `Excluir "${deleteTarget.name}"? Essa ação não pode ser desfeita.` : undefined}
        />
      </Container>
    </PermissionGuard>
  )
}
