'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { Badge, Button, Container, Dialog, Heading, Icon, SearchField, Table, Text, useToast, type TableColumn } from '@indianous/base-ds'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { CouponForm, EMPTY_COUPON_FORM, toCouponInput, type CouponFormState } from '@/components/forms/CouponForm'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { ManagementContentBody } from '@/components/layout/ManagementContentBody'
import { ManagementContentFooter } from '@/components/layout/ManagementContentFooter'
import { authFetch } from '@/lib/authFetch'
import { formatBRL, formatLocalDateTime, toDateTimeLocalValue } from '@/lib/format'
import { responseMessage } from '@/lib/promotions'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { Coupon, CouponRedemption, CouponStatus } from '@/types'

const STATUS_BADGE: Record<CouponStatus, { label: string; variant: 'success' | 'info' | 'warning' | 'default' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
  SCHEDULED: { label: 'Agendado', variant: 'info' },
  EXPIRED: { label: 'Expirado', variant: 'default' },
  EXHAUSTED: { label: 'Esgotado', variant: 'warning' },
  INACTIVE: { label: 'Inativo', variant: 'default' },
}

const discountLabel = (c: Coupon) => (c.type === 'PERCENT' ? `${c.value}%` : formatBRL(c.value))

function validityLabel(c: Coupon) {
  if (c.startsAt && c.endsAt) return `${formatLocalDateTime(c.startsAt)} a ${formatLocalDateTime(c.endsAt)}`
  if (c.startsAt) return `A partir de ${formatLocalDateTime(c.startsAt)}`
  if (c.endsAt) return `Até ${formatLocalDateTime(c.endsAt)}`
  return 'Sem validade'
}

function toForm(c: Coupon): CouponFormState {
  const text = (v: number | null) => (v === null ? '' : String(v))
  return {
    code: c.code,
    type: c.type,
    value: c.value,
    maxDiscountAmount: text(c.maxDiscountAmount),
    minSubtotal: text(c.minSubtotal),
    startsAt: toDateTimeLocalValue(c.startsAt),
    endsAt: toDateTimeLocalValue(c.endsAt),
    maxUses: text(c.maxUses),
    maxUsesPerCustomer: text(c.maxUsesPerCustomer),
    active: c.active,
  }
}

type FormDialog = { mode: 'new' } | { mode: 'edit'; coupon: Coupon } | null

export function CouponsContent({ ordersPath = '/dashboard/orders' }: { ordersPath?: string }) {
  const { toast } = useToast()
  const searchRef = useRef('')
  const [formDialog, setFormDialog] = useState<FormDialog>(null)
  const [form, setForm] = useState<CouponFormState>(EMPTY_COUPON_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [usesOf, setUsesOf] = useState<Coupon | null>(null)
  const [uses, setUses] = useState<CouponRedemption[] | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<Coupon> | null> => {
    if (searchRef.current) params.set('search', searchRef.current)
    const res = await authFetch(`/api/admin/coupons?${params}`)
    if (!res.ok) return null
    return res.json()
  }, [])

  const { page, items, totalPages, loading, goToPage, reload, refetch } = usePaginatedFetch(fetchPage)

  const openNew = () => {
    setForm(EMPTY_COUPON_FORM)
    setFormDialog({ mode: 'new' })
  }

  const openEdit = (coupon: Coupon) => {
    setForm(toForm(coupon))
    setFormDialog({ mode: 'edit', coupon })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDialog) return
    setSaving(true)
    try {
      const editing = formDialog.mode === 'edit'
      const input = toCouponInput(form)
      const res = await authFetch(editing ? `/api/admin/coupons/${formDialog.coupon.id}` : '/api/admin/coupons', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        toast({ variant: 'destructive', description: await responseMessage(res, 'Erro ao salvar o cupom.') })
        return
      }
      setFormDialog(null)
      toast({ variant: 'success', description: editing ? 'Cupom atualizado.' : `Cupom ${input.code} criado.` })
      await refetch()
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (coupon: Coupon) => {
    const res = await authFetch(`/api/admin/coupons/${coupon.id}/active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !coupon.active }),
    })
    if (!res.ok) {
      toast({ variant: 'destructive', description: await responseMessage(res, 'Erro ao alterar o cupom.') })
      return
    }
    toast({ variant: 'success', description: coupon.active ? `Cupom ${coupon.code} desativado.` : `Cupom ${coupon.code} ativado.` })
    await refetch()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await authFetch(`/api/admin/coupons/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast({ variant: 'destructive', description: await responseMessage(res, 'Erro ao excluir o cupom.') })
        return
      }
      setDeleteTarget(null)
      toast({ variant: 'success', description: 'Cupom excluído.' })
      await refetch()
    } finally {
      setDeleting(false)
    }
  }

  const openUses = async (coupon: Coupon) => {
    setUsesOf(coupon)
    setUses(null)
    const res = await authFetch(`/api/admin/coupons/${coupon.id}/redemptions?size=50`)
    setUses(res.ok ? ((await res.json()) as PageResult<CouponRedemption>).content : [])
  }

  const columns: TableColumn<Coupon>[] = [
    { key: 'code', header: 'Código', render: (c) => <span className="font-mono font-medium">{c.code}</span> },
    { key: 'discount', header: 'Desconto', render: discountLabel },
    { key: 'validity', header: 'Validade', render: validityLabel },
    { key: 'uses', header: 'Usos', render: (c) => `${c.usesCount} / ${c.maxUses ?? '∞'}` },
    {
      key: 'status',
      header: 'Situação',
      render: (c) => <Badge variant={STATUS_BADGE[c.status].variant} size="sm">{STATUS_BADGE[c.status].label}</Badge>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Ações</span>,
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label={`Editar ${c.code}`} variant="outline" size="sm" onClick={() => openEdit(c)} />
          <Button iconOnly leftIcon={<Icon name={c.active ? 'PowerOff' : 'Power'} size="sm" />}
            aria-label={`${c.active ? 'Desativar' : 'Ativar'} ${c.code}`} variant="outline" size="sm" onClick={() => void toggleActive(c)} />
          <Button iconOnly leftIcon={<Icon name="ListOrdered" size="sm" />} aria-label={`Usos de ${c.code}`} variant="outline" size="sm" onClick={() => void openUses(c)} />
          {c.usesCount > 0 ? (
            <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label={`${c.code} já foi usado — desative em vez de excluir`}
              variant="danger" size="sm" disabled />
          ) : (
            <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label={`Excluir ${c.code}`} variant="danger" size="sm" onClick={() => setDeleteTarget(c)} />
          )}
        </div>
      ),
    },
  ]

  const useColumns: TableColumn<CouponRedemption>[] = [
    {
      key: 'order',
      header: 'Pedido',
      render: (r) => <Link href={`${ordersPath}/${r.orderId}`} className="text-primary hover:underline">#{r.orderNumber}</Link>,
    },
    { key: 'customer', header: 'Cliente', render: (r) => r.customerName },
    { key: 'discount', header: 'Desconto', render: (r) => formatBRL(r.discountAmount) },
    { key: 'date', header: 'Data', render: (r) => formatLocalDateTime(r.redeemedAt) },
    { key: 'released', header: 'Situação', render: (r) => (r.releasedAt ? 'Devolvido' : 'Contando') },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_COUPONS']}>
      <Container className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Heading as="h1" size="2xl">Cupons</Heading>
          <Button leftIcon={<Icon name="Plus" size="sm" />} variant="primary" onClick={openNew}>Novo cupom</Button>
        </div>

        <SearchField
          id="coupons-search"
          label="Buscar cupons"
          placeholder="Buscar pelo código..."
          onSearch={(value) => { searchRef.current = value; reload() }}
        />

        <ManagementContentBody loading={loading} empty={items.length === 0} emptyMessage="Nenhum cupom cadastrado." loadingLabel="Carregando cupons">
          <Table columns={columns} data={items} caption="Cupons de desconto" />
        </ManagementContentBody>
        <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={goToPage} />

        <Dialog open={formDialog !== null} onClose={() => setFormDialog(null)} title={formDialog?.mode === 'edit' ? 'Editar cupom' : 'Novo cupom'}>
          <CouponForm
            form={form}
            onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            onSubmit={handleSave}
            saving={saving}
            valueLocked={formDialog?.mode === 'edit' && formDialog.coupon.usesCount > 0}
          />
        </Dialog>

        <Dialog open={usesOf !== null} onClose={() => setUsesOf(null)} title={usesOf ? `Usos do cupom ${usesOf.code}` : ''} className="max-w-3xl">
          {uses === null ? (
            <Text size="sm" color="muted">Carregando usos...</Text>
          ) : uses.length === 0 ? (
            <Text size="sm" color="muted">Este cupom ainda não foi usado.</Text>
          ) : (
            <Table columns={useColumns} data={uses} caption="Pedidos que usaram o cupom" />
          )}
        </Dialog>

        <ConfirmDeleteDialog
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
          title="Excluir cupom"
          description={deleteTarget ? `Excluir o cupom "${deleteTarget.code}"? Essa ação não pode ser desfeita.` : undefined}
        />
      </Container>
    </PermissionGuard>
  )
}
