'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge, Button, Card, Dialog, Heading, Icon, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { NavItemForm, EMPTY_NAV_ITEM_FORM, type NavItemFormState } from '@/components/forms/NavItemForm'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { useConfirmDelete } from '@/lib/useConfirmDelete'
import type { NavPlacement, SiteNavItem } from '@/types'

const PLACEMENT_LABELS: Record<NavPlacement, string> = {
  NAVBAR: 'Navbar',
  FOOTER: 'Footer',
  BOTH: 'Ambos',
}

type DialogState =
  | { mode: 'new-top-level' }
  | { mode: 'edit'; item: SiteNavItem }
  | { mode: 'new-child'; collectionId: string }
  | { mode: 'edit-child'; collectionId: string; item: SiteNavItem }
  | null

export function NavigationContent({ backPath = '/dashboard/site' }: { backPath?: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const [items, setItems] = useState<SiteNavItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [form, setForm] = useState<NavItemFormState>(EMPTY_NAV_ITEM_FORM)
  const [saving, setSaving] = useState(false)

  const fetchTree = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch('/api/admin/site/nav-items', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { fetchTree() }, [fetchTree])

  const closeDialog = () => {
    setDialog(null)
    setForm(EMPTY_NAV_ITEM_FORM)
  }

  const openNewTopLevel = (type: NavItemFormState['type']) => {
    setForm({ ...EMPTY_NAV_ITEM_FORM, type })
    setDialog({ mode: 'new-top-level' })
  }

  const openNewChild = (collectionId: string) => {
    setForm(EMPTY_NAV_ITEM_FORM)
    setDialog({ mode: 'new-child', collectionId })
  }

  const openEdit = (item: SiteNavItem) => {
    setForm({ type: item.type, label: item.label, url: item.url ?? '', placement: item.placement ?? '' })
    setDialog({ mode: 'edit', item })
  }

  const openEditChild = (collectionId: string, item: SiteNavItem) => {
    setForm({ type: item.type, label: item.label, url: item.url ?? '', placement: '' })
    setDialog({ mode: 'edit-child', collectionId, item })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !dialog) return
    setSaving(true)
    try {
      if (dialog.mode === 'new-top-level') {
        const res = await fetch('/api/admin/site/nav-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ type: form.type, label: form.label, url: form.url || null, placement: form.placement || null, parentId: null }),
        })
        if (!res.ok) throw new Error()
      } else if (dialog.mode === 'new-child') {
        const res = await fetch('/api/admin/site/nav-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ type: 'LINK', label: form.label, url: form.url || null, placement: null, parentId: dialog.collectionId }),
        })
        if (!res.ok) throw new Error()
      } else if (dialog.mode === 'edit' || dialog.mode === 'edit-child') {
        const id = dialog.item.id
        const res = await fetch(`/api/admin/site/nav-items/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ label: form.label, url: form.url || null, placement: form.placement || null }),
        })
        if (!res.ok) throw new Error()
      }
      await fetchTree()
      closeDialog()
      toast({ variant: 'success', description: 'Item de navegação salvo com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar item de navegação.' })
    } finally {
      setSaving(false)
    }
  }

  const performDelete = async (item: SiteNavItem) => {
    if (!accessToken) return
    const res = await fetch(`/api/admin/site/nav-items/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok && res.status !== 204) {
      toast({ variant: 'destructive', description: 'Erro ao remover item.' })
      throw new Error()
    }
    await fetchTree()
    toast({ variant: 'success', description: 'Item removido com sucesso.' })
  }

  const {
    target: deleteTarget,
    setTarget: setDeleteTarget,
    deleting: deletingItem,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmDelete(performDelete)

  const deleteTargetIsCascadingCollection =
    deleteTarget?.type === 'COLLECTION' && (deleteTarget.children?.length ?? 0) > 0

  const reorderTopLevel = async (fromIndex: number, toIndex: number) => {
    if (!accessToken || toIndex < 0 || toIndex >= items.length) return
    const reordered = [...items]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    setItems(reordered)
    await fetch('/api/admin/site/nav-items/order', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
    })
    await fetchTree()
  }

  const reorderChildren = async (collection: SiteNavItem, fromIndex: number, toIndex: number) => {
    if (!accessToken) return
    const children = collection.children ?? []
    if (toIndex < 0 || toIndex >= children.length) return
    const reordered = [...children]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    await fetch(`/api/admin/site/nav-items/${collection.id}/children-order`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
    })
    await fetchTree()
  }

  if (loading) return <main className="px-4 py-8"><p>Carregando navegação...</p></main>

  return (
    <PermissionGuard permissions={['MANAGE_SITE']}>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href={backPath} className="text-sm text-muted-foreground hover:underline">
            ← Voltar
          </Link>
          <Heading as="h1" size="2xl">Navegação do site</Heading>
        </div>

        <div className="mb-4 flex gap-2">
          <Button iconOnly leftIcon={<Icon name="FolderPlus" size="sm" />} aria-label="Nova coleção" variant="primary" onClick={() => openNewTopLevel('COLLECTION')} />
          <Button iconOnly leftIcon={<Icon name="Link" size="sm" />} aria-label="Novo link" variant="outline" onClick={() => openNewTopLevel('LINK')} />
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item, index) => {
            const isExpanded = expandedId === item.id
            return (
              <Card key={item.id} variant="outlined">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" size="sm">{item.type === 'COLLECTION' ? 'Coleção' : 'Link'}</Badge>
                    <Text weight="bold">{item.label}</Text>
                    {item.placement && <Badge variant="info" size="sm">{PLACEMENT_LABELS[item.placement]}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button iconOnly leftIcon={<Icon name="ChevronUp" size="sm" />} aria-label={`Subir ${item.label}`} variant="ghost" size="sm" disabled={index === 0} onClick={() => reorderTopLevel(index, index - 1)} />
                    <Button iconOnly leftIcon={<Icon name="ChevronDown" size="sm" />} aria-label={`Descer ${item.label}`} variant="ghost" size="sm" disabled={index === items.length - 1} onClick={() => reorderTopLevel(index, index + 1)} />
                    {item.type === 'COLLECTION' && (
                      <Button iconOnly leftIcon={<Icon name={isExpanded ? 'ChevronDown' : 'ChevronRight'} size="sm" />} aria-label={isExpanded ? 'Recolher' : 'Expandir'} variant="outline" size="sm" onClick={() => setExpandedId(isExpanded ? null : item.id)} />
                    )}
                    <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label={`Editar ${item.label}`} variant="outline" size="sm" onClick={() => openEdit(item)} />
                    <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label={`Remover ${item.label}`} variant="danger" size="sm" onClick={() => setDeleteTarget(item)} />
                  </div>
                </div>

                {item.type === 'COLLECTION' && isExpanded && (
                  <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                    {(item.children ?? []).map((child, childIndex) => (
                      <div key={child.id} className="flex items-center justify-between gap-2 pl-4">
                        <Text size="sm">{child.label}</Text>
                        <div className="flex gap-1">
                          <Button iconOnly leftIcon={<Icon name="ChevronUp" size="sm" />} aria-label={`Subir ${child.label}`} variant="ghost" size="sm" disabled={childIndex === 0} onClick={() => reorderChildren(item, childIndex, childIndex - 1)} />
                          <Button iconOnly leftIcon={<Icon name="ChevronDown" size="sm" />} aria-label={`Descer ${child.label}`} variant="ghost" size="sm" disabled={childIndex === (item.children?.length ?? 0) - 1} onClick={() => reorderChildren(item, childIndex, childIndex + 1)} />
                          <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label={`Editar ${child.label}`} variant="outline" size="sm" onClick={() => openEditChild(item.id, child)} />
                          <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label={`Remover ${child.label}`} variant="danger" size="sm" onClick={() => setDeleteTarget(child)} />
                        </div>
                      </div>
                    ))}
                    <Button iconOnly leftIcon={<Icon name="Plus" size="sm" />} aria-label={`Novo link em ${item.label}`} variant="outline" size="sm" className="self-start" onClick={() => openNewChild(item.id)} />
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        <Dialog
          open={dialog !== null}
          onClose={closeDialog}
          title={
            dialog?.mode === 'edit' || dialog?.mode === 'edit-child'
              ? 'Editar item'
              : dialog?.mode === 'new-child'
                ? 'Novo link'
                : 'Novo item de navegação'
          }
        >
          <NavItemForm
            form={form}
            onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            onSubmit={handleSubmit}
            saving={saving}
            isChild={dialog?.mode === 'new-child' || dialog?.mode === 'edit-child'}
          />
        </Dialog>

        <ConfirmDeleteDialog
          open={deleteTarget !== null}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          deleting={deletingItem}
          title={deleteTargetIsCascadingCollection ? 'Remover coleção' : 'Remover item'}
          description={
            deleteTargetIsCascadingCollection
              ? `A coleção "${deleteTarget?.label}" tem ${deleteTarget?.children?.length ?? 0} link(s) dentro. Removê-la também remove todos os links dentro dela.`
              : `Remover "${deleteTarget?.label}"?`
          }
        />
      </main>
    </PermissionGuard>
  )
}
