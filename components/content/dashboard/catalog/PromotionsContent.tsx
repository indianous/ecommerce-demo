'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Badge, Button, Container, Dialog, Heading, Icon, Table, Tabs, useToast, type TableColumn } from '@indianous/base-ds'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { EMPTY_PROMOTION_FORM, PromotionForm, type PromotionFormState } from '@/components/forms/PromotionForm'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { ManagementContentBody } from '@/components/layout/ManagementContentBody'
import { ManagementContentFooter } from '@/components/layout/ManagementContentFooter'
import { authFetch } from '@/lib/authFetch'
import { formatLocalDateTime } from '@/lib/format'
import {
  PROMOTION_STATUS_BADGE,
  promotionDiscountLabel,
  responseMessage,
  toPromotionForm,
  toPromotionInput,
} from '@/lib/promotions'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { Promotion, PromotionStatus } from '@/types'

type TabId = PromotionStatus | 'ALL'

const TABS: { id: TabId; label: string; empty: string }[] = [
  { id: 'ACTIVE', label: 'Ativas', empty: 'Nenhuma promoção ativa.' },
  { id: 'SCHEDULED', label: 'Agendadas', empty: 'Nenhuma promoção agendada.' },
  { id: 'EXPIRED', label: 'Encerradas', empty: 'Nenhuma promoção encerrada.' },
  { id: 'ALL', label: 'Todas', empty: 'Nenhuma promoção cadastrada.' },
]

type FormDialog = { mode: 'new' } | { mode: 'edit'; promotion: Promotion } | null
type Confirm = { kind: 'end' | 'delete'; promotion: Promotion } | null

export function PromotionsContent({ basePath = '/dashboard/promotions' }: { basePath?: string }) {
  const { toast } = useToast()
  const [tab, setTab] = useState<TabId>('ACTIVE')
  const [formDialog, setFormDialog] = useState<FormDialog>(null)
  const [form, setForm] = useState<PromotionFormState>(EMPTY_PROMOTION_FORM)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [confirming, setConfirming] = useState(false)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<Promotion> | null> => {
    if (tab !== 'ALL') params.set('status', tab)
    const res = await authFetch(`/api/admin/promotions?${params}`)
    if (!res.ok) return null
    return res.json()
  }, [tab])

  const { page, items, totalPages, loading, goToPage, refetch } = usePaginatedFetch(fetchPage)

  const changeTab = (id: string) => {
    setTab(id as TabId)
    if (page !== 1) goToPage(1)
  }

  const openNew = () => {
    setForm(EMPTY_PROMOTION_FORM)
    setFormDialog({ mode: 'new' })
  }

  const openEdit = (promotion: Promotion) => {
    setForm(toPromotionForm(promotion))
    setFormDialog({ mode: 'edit', promotion })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDialog) return
    setSaving(true)
    try {
      const editing = formDialog.mode === 'edit'
      const input = toPromotionInput(form)
      const res = await authFetch(editing ? `/api/admin/promotions/${formDialog.promotion.id}` : '/api/admin/promotions', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? input : { ...input, productIds: [] }),
      })
      if (!res.ok) {
        toast({ variant: 'destructive', description: await responseMessage(res, 'Erro ao salvar a promoção.') })
        return
      }
      setFormDialog(null)
      toast({ variant: 'success', description: editing ? 'Promoção atualizada.' : `Promoção ${input.name} criada.` })
      await refetch()
    } finally {
      setSaving(false)
    }
  }

  const handleConfirm = async () => {
    if (!confirm) return
    setConfirming(true)
    try {
      const { kind, promotion } = confirm
      const res = await authFetch(
        kind === 'end' ? `/api/admin/promotions/${promotion.id}/end` : `/api/admin/promotions/${promotion.id}`,
        { method: kind === 'end' ? 'POST' : 'DELETE' },
      )
      if (!res.ok) {
        toast({ variant: 'destructive', description: await responseMessage(res, 'Erro ao alterar a promoção.') })
        return
      }
      setConfirm(null)
      toast({ variant: 'success', description: kind === 'end' ? 'Promoção encerrada.' : 'Promoção excluída.' })
      await refetch()
    } finally {
      setConfirming(false)
    }
  }

  const columns: TableColumn<Promotion>[] = [
    {
      key: 'name',
      header: 'Promoção',
      render: (p) => (
        <Link href={`${basePath}/${p.id}`} className="font-medium text-primary hover:underline">
          {p.name}
        </Link>
      ),
    },
    { key: 'discount', header: 'Desconto', render: (p) => promotionDiscountLabel(p) },
    { key: 'start', header: 'Início', render: (p) => formatLocalDateTime(p.startDate) },
    { key: 'end', header: 'Fim', render: (p) => formatLocalDateTime(p.endDate) },
    { key: 'productCount', header: 'Produtos', render: (p) => p.productCount },
    {
      key: 'status',
      header: 'Situação',
      render: (p) => (
        <Badge variant={PROMOTION_STATUS_BADGE[p.status].variant} size="sm">{PROMOTION_STATUS_BADGE[p.status].label}</Badge>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Ações</span>,
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label={`Editar ${p.name}`} variant="outline" size="sm" onClick={() => openEdit(p)} />
          {p.status === 'ACTIVE' && (
            <Button iconOnly leftIcon={<Icon name="CircleOff" size="sm" />} aria-label={`Encerrar ${p.name}`} variant="outline" size="sm" onClick={() => setConfirm({ kind: 'end', promotion: p })} />
          )}
          <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label={`Excluir ${p.name}`} variant="danger" size="sm" onClick={() => setConfirm({ kind: 'delete', promotion: p })} />
        </div>
      ),
    },
  ]

  const emptyMessage = TABS.find((t) => t.id === tab)?.empty ?? ''
  const body = (
    <div className="flex flex-col gap-4 pt-4">
      <ManagementContentBody loading={loading} empty={items.length === 0} emptyMessage={emptyMessage} loadingLabel="Carregando promoções">
        <Table columns={columns} data={items} caption="Promoções" />
      </ManagementContentBody>
      <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={goToPage} />
    </div>
  )

  return (
    <PermissionGuard permissions={['MANAGE_PRODUCTS']}>
      <Container>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Heading as="h1" size="2xl">Promoções</Heading>
          <Button leftIcon={<Icon name="Plus" size="sm" />} variant="primary" onClick={openNew}>Nova promoção</Button>
        </div>

        <Tabs tabs={TABS.map((t) => ({ id: t.id, label: t.label, content: body }))} defaultTab="ACTIVE" onChange={changeTab} />

        <Dialog
          open={formDialog !== null}
          onClose={() => setFormDialog(null)}
          title={formDialog?.mode === 'edit' ? 'Editar promoção' : 'Nova promoção'}
          description={formDialog?.mode === 'new' ? 'Os produtos entram pela listagem de produtos ("Aplicar promoção").' : undefined}
        >
          <PromotionForm
            form={form}
            onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            onSubmit={handleSave}
            saving={saving}
            submitLabel={formDialog?.mode === 'new' ? 'Criar promoção' : 'Salvar promoção'}
          />
        </Dialog>

        <ConfirmDeleteDialog
          open={confirm !== null}
          onClose={() => setConfirm(null)}
          onConfirm={handleConfirm}
          deleting={confirming}
          title={confirm?.kind === 'end' ? 'Encerrar promoção' : 'Excluir promoção'}
          description={
            confirm?.kind === 'end'
              ? `Encerrar "${confirm.promotion.name}" agora? O preço dos produtos volta ao normal na hora.`
              : confirm
                ? `Excluir "${confirm.promotion.name}"? Os produtos saem da promoção e voltam ao preço normal.`
                : undefined
          }
        />
      </Container>
    </PermissionGuard>
  )
}
