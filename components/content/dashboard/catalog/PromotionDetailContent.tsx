'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge, Button, Container, Dialog, Heading, Icon, Skeleton, Table, Text, useToast, type TableColumn } from '@indianous/base-ds'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { PromotionForm, type PromotionFormState } from '@/components/forms/PromotionForm'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { SelectionBar } from '@/components/layout/SelectionBar'
import { makeSelectionColumn } from '@/components/layout/selectionColumn'
import { authFetch } from '@/lib/authFetch'
import { formatBRL, formatLocalDateTime } from '@/lib/format'
import {
  PROMOTION_STATUS_BADGE,
  productsLabel,
  promotionRuleLabel,
  responseMessage,
  toPromotionForm,
  toPromotionInput,
} from '@/lib/promotions'
import { useRowSelection } from '@/lib/useRowSelection'
import type { PromotionDetail, PromotionProduct } from '@/types'

type Confirm = 'remove' | 'end' | 'delete' | null

interface Props {
  id: string
  basePath?: string
}

export function PromotionDetailContent({ id, basePath = '/dashboard/promotions' }: Props) {
  const { toast } = useToast()
  const router = useRouter()
  const [promotion, setPromotion] = useState<PromotionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState<PromotionFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [confirming, setConfirming] = useState(false)
  const selection = useRowSelection()

  const applyResponse = useCallback(async (res: Response) => {
    if (res.status === 404) setNotFound(true)
    else if (res.ok) setPromotion(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    void authFetch(`/api/admin/promotions/${id}`).then(applyResponse)
  }, [id, applyResponse])

  const load = async () => applyResponse(await authFetch(`/api/admin/promotions/${id}`))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    try {
      const res = await authFetch(`/api/admin/promotions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPromotionInput(form)),
      })
      if (!res.ok) {
        toast({ variant: 'destructive', description: await responseMessage(res, 'Erro ao salvar a promoção.') })
        return
      }
      setForm(null)
      toast({ variant: 'success', description: 'Promoção atualizada.' })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleConfirm = async () => {
    if (!confirm || !promotion) return
    setConfirming(true)
    try {
      const productIds = promotion.products.filter((p) => selection.isSelected(p.productId)).map((p) => p.productId)
      const request =
        confirm === 'remove'
          ? { url: `/api/admin/promotions/${id}/products/remove`, method: 'POST', body: JSON.stringify({ productIds }) }
          : confirm === 'end'
            ? { url: `/api/admin/promotions/${id}/end`, method: 'POST' }
            : { url: `/api/admin/promotions/${id}`, method: 'DELETE' }
      const res = await authFetch(request.url, {
        method: request.method,
        ...(request.body ? { headers: { 'Content-Type': 'application/json' }, body: request.body } : {}),
      })
      if (!res.ok) {
        toast({ variant: 'destructive', description: await responseMessage(res, 'Erro ao alterar a promoção.') })
        return
      }
      setConfirm(null)
      if (confirm === 'delete') {
        toast({ variant: 'success', description: 'Promoção excluída.' })
        router.push(basePath)
        return
      }
      if (confirm === 'remove') {
        selection.clear()
        toast({
          variant: 'success',
          description: `${productsLabel(productIds.length)} ${productIds.length === 1 ? 'removido' : 'removidos'} da promoção.`,
        })
      } else {
        toast({ variant: 'success', description: 'Promoção encerrada.' })
      }
      await load()
    } finally {
      setConfirming(false)
    }
  }

  const backLink = (
    <Link href={basePath} className="text-sm text-muted-foreground hover:underline">← Voltar</Link>
  )

  if (loading) {
    return (
      <Container>
        <div className="flex flex-col gap-2" role="status" aria-label="Carregando promoção">
          <Skeleton variant="line" height={32} />
          <Skeleton variant="line" height={120} />
        </div>
      </Container>
    )
  }

  if (notFound || !promotion) {
    return (
      <Container className="flex flex-col gap-4">
        {backLink}
        <Text>Promoção não encontrada.</Text>
      </Container>
    )
  }

  const products = promotion.products
  const columns: TableColumn<PromotionProduct>[] = [
    makeSelectionColumn(products, (p) => p.productId, (p) => p.name, selection.selectedIds, selection.toggle, selection.selectAll),
    { key: 'name', header: 'Produto', render: (p) => p.name },
    { key: 'price', header: 'Preço', render: (p) => formatBRL(p.price) },
    { key: 'promotionalPrice', header: 'Preço promocional', render: (p) => formatBRL(p.promotionalPrice) },
  ]
  const badge = PROMOTION_STATUS_BADGE[promotion.status]

  return (
    <PermissionGuard permissions={['MANAGE_PRODUCTS']}>
      <Container className="flex flex-col gap-6">
        {backLink}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <Heading as="h1" size="2xl">{promotion.name}</Heading>
              <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
            </div>
            <Text color="muted">{promotionRuleLabel(promotion)}</Text>
            <Text size="sm" color="muted">
              {formatLocalDateTime(promotion.startDate)} a {formatLocalDateTime(promotion.endDate)}
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<Icon name="Pencil" size="sm" />} variant="outline" onClick={() => setForm(toPromotionForm(promotion))}>Editar</Button>
            {promotion.status === 'ACTIVE' && (
              <Button leftIcon={<Icon name="CircleOff" size="sm" />} variant="outline" onClick={() => setConfirm('end')}>Encerrar</Button>
            )}
            <Button leftIcon={<Icon name="Trash2" size="sm" />} variant="danger" onClick={() => setConfirm('delete')}>Excluir</Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Heading as="h2" size="xl">Produtos ({products.length})</Heading>
          <SelectionBar
            selectedCount={selection.selectedCount}
            onClear={selection.clear}
            actions={
              <Button leftIcon={<Icon name="X" size="sm" />} variant="danger" size="sm" onClick={() => setConfirm('remove')}>
                Remover da promoção
              </Button>
            }
          />
          {products.length === 0 ? (
            <Text color="muted">Nenhum produto nesta promoção. Adicione pela listagem de produtos, em &ldquo;Aplicar promoção&rdquo;.</Text>
          ) : (
            <Table columns={columns} data={products} caption={`Produtos da promoção ${promotion.name}`} />
          )}
        </div>

        <Dialog open={form !== null} onClose={() => setForm(null)} title="Editar promoção">
          {form && (
            <PromotionForm
              form={form}
              onFormChange={(patch) => setForm((f) => (f ? { ...f, ...patch } : f))}
              onSubmit={handleSave}
              saving={saving}
            />
          )}
        </Dialog>

        <ConfirmDeleteDialog
          open={confirm !== null}
          onClose={() => setConfirm(null)}
          onConfirm={handleConfirm}
          deleting={confirming}
          title={confirm === 'remove' ? 'Remover da promoção' : confirm === 'end' ? 'Encerrar promoção' : 'Excluir promoção'}
          description={
            confirm === 'remove'
              ? `Tirar ${productsLabel(selection.selectedCount)} de "${promotion.name}"? O preço volta ao normal.`
              : confirm === 'end'
                ? `Encerrar "${promotion.name}" agora? O preço dos produtos volta ao normal na hora.`
                : `Excluir "${promotion.name}"? Os produtos saem da promoção e voltam ao preço normal.`
          }
        />
      </Container>
    </PermissionGuard>
  )
}
