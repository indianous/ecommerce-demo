'use client'

import { useEffect, useState } from 'react'
import { Button, Dialog, FormField, Icon, Radio, Select, Text, useToast } from 'base-ds'
import { EMPTY_PROMOTION_FORM, PromotionForm, type PromotionFormState } from '@/components/forms/PromotionForm'
import { authFetch } from '@/lib/authFetch'
import { productsLabel, promotionDiscountLabel, responseMessage, toPromotionInput } from '@/lib/promotions'
import type { Product, Promotion } from '@/types'

type Mode = 'new' | 'existing'

interface Props {
  open: boolean
  onClose: () => void
  /** Produtos selecionados na listagem. */
  products: Product[]
  onApplied: () => void
}

/** Coloca os produtos selecionados numa promoção nova ou numa que já existe (ativa ou agendada). */
export function ApplyPromotionDialog({ open, onClose, products, onApplied }: Props) {
  const { toast } = useToast()
  const [mode, setMode] = useState<Mode>('new')
  const [form, setForm] = useState<PromotionFormState>(EMPTY_PROMOTION_FORM)
  const [promotions, setPromotions] = useState<Promotion[] | null>(null)
  const [promotionId, setPromotionId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || mode !== 'existing' || promotions !== null) return
    void authFetch('/api/admin/promotions?size=100')
      .then((res) => (res.ok ? res.json() : { content: [] }))
      .then((page: { content: Promotion[] }) => setPromotions(page.content.filter((p) => p.status !== 'EXPIRED')))
      .catch(() => setPromotions([]))
  }, [open, mode, promotions])

  const productIds = products.map((p) => p.id)
  const count = products.length

  /** Fecha voltando ao estado inicial, para a próxima abertura começar do zero. */
  const close = () => {
    setMode('new')
    setForm(EMPTY_PROMOTION_FORM)
    setPromotionId('')
    setPromotions(null)
    onClose()
  }

  const finish = (description: string) => {
    toast({ variant: 'success', description })
    onApplied()
    close()
  }

  const createPromotion = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const input = toPromotionInput(form)
      const res = await authFetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, productIds }),
      })
      if (!res.ok) {
        toast({ variant: 'destructive', description: await responseMessage(res, 'Erro ao criar a promoção.') })
        return
      }
      finish(`Promoção ${input.name} criada com ${productsLabel(count)}.`)
    } finally {
      setSaving(false)
    }
  }

  const addToExisting = async () => {
    const promotion = promotions?.find((p) => p.id === promotionId)
    if (!promotion) return
    setSaving(true)
    try {
      const res = await authFetch(`/api/admin/promotions/${promotion.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds }),
      })
      if (!res.ok) {
        toast({ variant: 'destructive', description: await responseMessage(res, 'Erro ao adicionar à promoção.') })
        return
      }
      finish(`${productsLabel(count)} ${count === 1 ? 'adicionado' : 'adicionados'} à promoção ${promotion.name}.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} title={`Aplicar promoção em ${productsLabel(count)}`}>
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-wrap gap-4">
          <legend className="sr-only">Onde colocar os produtos</legend>
          <Radio id="apply-mode-new" name="apply-mode" value="new" label="Nova promoção"
            checked={mode === 'new'} onChange={() => setMode('new')} />
          <Radio id="apply-mode-existing" name="apply-mode" value="existing" label="Promoção existente"
            checked={mode === 'existing'} onChange={() => setMode('existing')} />
        </fieldset>

        {mode === 'new' ? (
          <PromotionForm
            form={form}
            onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            onSubmit={createPromotion}
            saving={saving}
            basePrice={count === 1 ? products[0].price : undefined}
            submitLabel="Criar promoção"
          />
        ) : promotions === null ? (
          <Text size="sm" color="muted">Carregando promoções...</Text>
        ) : promotions.length === 0 ? (
          <Text size="sm" color="muted">Nenhuma promoção ativa ou agendada. Crie uma nova.</Text>
        ) : (
          <>
            <FormField label="Promoção" id="apply-promotion-id">
              <Select
                id="apply-promotion-id"
                value={promotionId}
                placeholder="Escolha uma promoção"
                onChange={(e) => setPromotionId(e.target.value)}
                options={promotions.map((p) => ({ value: p.id, label: `${p.name} (${promotionDiscountLabel(p)})` }))}
              />
            </FormField>
            <div>
              <Button leftIcon={<Icon name="BadgePercent" size="sm" />} variant="primary" disabled={!promotionId}
                isLoading={saving} onClick={addToExisting}>
                Adicionar à promoção
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
