'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Card, Dialog, Heading, Icon, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import {
  DistributionCenterForm,
  EMPTY_DISTRIBUTION_CENTER_FORM,
  type DistributionCenterFormState,
} from '@/components/forms/DistributionCenterForm'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { useConfirmDelete } from '@/lib/useConfirmDelete'
import type { DistributionCenter } from '@/types'

type DialogState = { mode: 'new' } | { mode: 'edit'; center: DistributionCenter } | null

function toFormState(center: DistributionCenter): DistributionCenterFormState {
  return {
    name: center.name,
    phone: center.phone ?? '',
    street: center.street,
    number: center.number,
    complement: center.complement ?? '',
    district: center.district,
    city: center.city,
    state: center.state,
    zipCode: center.zipCode,
  }
}

export function DistributionCentersContent({ backPath = '/dashboard/site' }: { backPath?: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const [centers, setCenters] = useState<DistributionCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [form, setForm] = useState<DistributionCenterFormState>(EMPTY_DISTRIBUTION_CENTER_FORM)
  const [saving, setSaving] = useState(false)

  const fetchCenters = useCallback(async () => {
    try {
      const res = await fetch('/api/site/distribution-centers')
      if (res.ok) setCenters(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCenters() }, [fetchCenters])

  const closeDialog = () => {
    setDialog(null)
    setForm(EMPTY_DISTRIBUTION_CENTER_FORM)
  }

  const openNew = () => {
    setForm(EMPTY_DISTRIBUTION_CENTER_FORM)
    setDialog({ mode: 'new' })
  }

  const openEdit = (center: DistributionCenter) => {
    setForm(toFormState(center))
    setDialog({ mode: 'edit', center })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !dialog) return
    setSaving(true)
    try {
      const body = {
        name: form.name,
        phone: form.phone || null,
        street: form.street,
        number: form.number,
        complement: form.complement || null,
        district: form.district,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
      }
      const res = await fetch(
        dialog.mode === 'edit' ? `/api/site/distribution-centers/${dialog.center.id}` : '/api/site/distribution-centers',
        {
          method: dialog.mode === 'edit' ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        },
      )
      if (!res.ok) throw new Error()
      await fetchCenters()
      closeDialog()
      toast({ variant: 'success', description: 'Centro de distribuição salvo com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar centro de distribuição.' })
    } finally {
      setSaving(false)
    }
  }

  const performDelete = async (center: DistributionCenter) => {
    if (!accessToken) return
    const res = await fetch(`/api/site/distribution-centers/${center.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok && res.status !== 204) {
      toast({ variant: 'destructive', description: 'Erro ao remover centro de distribuição.' })
      throw new Error()
    }
    setCenters((prev) => prev.filter((c) => c.id !== center.id))
    toast({ variant: 'success', description: 'Centro de distribuição removido.' })
  }

  const {
    target: deleteTarget,
    setTarget: setDeleteTarget,
    deleting,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmDelete(performDelete)

  if (loading) return <main className="px-4 py-8"><p>Carregando centros de distribuição...</p></main>

  return (
    <PermissionGuard permissions={['MANAGE_SITE']}>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href={backPath} className="text-sm text-muted-foreground hover:underline">
            ← Voltar
          </Link>
          <Heading as="h1" size="2xl">Centros de distribuição</Heading>
        </div>

        <div className="mb-4">
          <Button leftIcon={<Icon name="Plus" size="sm" />} variant="primary" onClick={openNew}>Novo centro de distribuição</Button>
        </div>

        {centers.length === 0 ? (
          <Text color="muted">Nenhum centro de distribuição cadastrado.</Text>
        ) : (
          <div className="flex flex-col gap-3">
            {centers.map((center) => (
              <Card key={center.id} variant="outlined">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Text weight="bold">{center.name}</Text>
                    <Text size="sm" color="muted">
                      {center.street}, {center.number}{center.complement ? ` — ${center.complement}` : ''} — {center.district}, {center.city}/{center.state} — {center.zipCode}
                    </Text>
                    {center.phone && <Text size="sm" color="muted">{center.phone}</Text>}
                  </div>
                  <div className="flex gap-1">
                    <Button leftIcon={<Icon name="Pencil" size="sm" />} variant="outline" size="sm" onClick={() => openEdit(center)}>{`Editar ${center.name}`}</Button>
                    <Button leftIcon={<Icon name="Trash2" size="sm" />} variant="danger" size="sm" onClick={() => setDeleteTarget(center)}>{`Remover ${center.name}`}</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog
          open={dialog !== null}
          onClose={closeDialog}
          title={dialog?.mode === 'edit' ? 'Editar centro de distribuição' : 'Novo centro de distribuição'}
        >
          <DistributionCenterForm
            form={form}
            onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            onSubmit={handleSubmit}
            saving={saving}
          />
        </Dialog>

        <ConfirmDeleteDialog
          open={deleteTarget !== null}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          deleting={deleting}
          title="Remover centro de distribuição"
          description={deleteTarget ? `Remover "${deleteTarget.name}"? Essa ação não pode ser desfeita.` : undefined}
        />
      </main>
    </PermissionGuard>
  )
}
