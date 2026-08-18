'use client'

import { Card, Checkbox, FileUpload, FormField, Input, NumberInput, Select } from 'base-ds'
import { IconButton } from '@/components/ui/IconButton'
import type { Category, MerchandiseOrigin } from '@/types'

const MAX_IMAGES = 8

export type ProductFormState = {
  name: string
  description: string
  price: number
  categoryIds: string[]
  imageUrls: string[]
  slug: string
  metaTitle: string
  metaDescription: string
  ncm: string
  cfop: string
  commercialUnit: string
  gtinEan: string
  origin: MerchandiseOrigin | ''
  promotionalPrice: number
  promotionStartDate: string
  promotionEndDate: string
}

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '',
  description: '',
  price: 0,
  categoryIds: [],
  imageUrls: [],
  slug: '',
  metaTitle: '',
  metaDescription: '',
  ncm: '',
  cfop: '',
  commercialUnit: '',
  gtinEan: '',
  origin: '',
  promotionalPrice: 0,
  promotionStartDate: '',
  promotionEndDate: '',
}

const MERCHANDISE_ORIGIN_OPTIONS: { value: MerchandiseOrigin; label: string }[] = [
  { value: 'NACIONAL', label: 'Nacional' },
  { value: 'ESTRANGEIRA_IMPORTACAO_DIRETA', label: 'Estrangeira — importação direta' },
  { value: 'ESTRANGEIRA_ADQUIRIDA_MERCADO_INTERNO', label: 'Estrangeira — adquirida no mercado interno' },
  { value: 'NACIONAL_CONTEUDO_IMPORTACAO_SUPERIOR_40', label: 'Nacional — conteúdo de importação > 40%' },
  { value: 'NACIONAL_PROCESSO_PRODUTIVO_BASICO', label: 'Nacional — processo produtivo básico' },
  { value: 'NACIONAL_CONTEUDO_IMPORTACAO_INFERIOR_IGUAL_40', label: 'Nacional — conteúdo de importação ≤ 40%' },
  { value: 'ESTRANGEIRA_IMPORTACAO_DIRETA_SEM_SIMILAR', label: 'Estrangeira — importação direta, sem similar nacional' },
  { value: 'ESTRANGEIRA_ADQUIRIDA_MERCADO_INTERNO_SEM_SIMILAR', label: 'Estrangeira — adquirida no mercado interno, sem similar nacional' },
  { value: 'NACIONAL_CONTEUDO_IMPORTACAO_SUPERIOR_70', label: 'Nacional — conteúdo de importação > 70%' },
]

type ProductFormProps = {
  form: ProductFormState
  onFormChange: (patch: Partial<ProductFormState>) => void
  categories: Category[]
  editingId: string | null
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
  accessToken: string | null
  saveLabel?: string
}

export function ProductForm({
  form,
  onFormChange,
  categories,
  saving,
  onSubmit,
  accessToken,
  saveLabel = 'Salvar',
}: ProductFormProps) {
  const uploadedFileCountRef = useRef(0)

  const toggleCategory = (id: string) => {
    const next = form.categoryIds.includes(id)
      ? form.categoryIds.filter((c) => c !== id)
      : [...form.categoryIds, id]
    onFormChange({ categoryIds: next })
  }

  const setPrimaryCategory = (id: string) => {
    onFormChange({ categoryIds: [id, ...form.categoryIds.filter((c) => c !== id)] })
  }

  const ncmError =
    form.ncm && !/^\d{8}$/.test(form.ncm) ? 'NCM deve ter 8 dígitos numéricos' : undefined

  const promotionDatesError =
    (form.promotionStartDate || form.promotionEndDate) &&
    (!form.promotionStartDate || !form.promotionEndDate)
      ? 'Início e fim da promoção são obrigatórios juntos'
      : undefined

  const promotionPriceError =
    form.promotionalPrice > 0 && form.promotionalPrice >= form.price
      ? 'Preço promocional precisa ser menor que o preço normal'
      : undefined

  const handleImagesChange = async (files: File[]) => {
    const alreadyProcessed = uploadedFileCountRef.current
    const newFiles = files.slice(alreadyProcessed)
    uploadedFileCountRef.current = files.length

    const remainingSlots = Math.max(MAX_IMAGES - form.imageUrls.length, 0)
    const filesToUpload = newFiles.slice(0, remainingSlots)

    let uploaded = form.imageUrls
    for (const file of filesToUpload) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      })
      if (res.ok) {
        const { url } = await res.json()
        uploaded = [...uploaded, url]
        onFormChange({ imageUrls: uploaded })
      }
    }
  }

  const removeImage = (index: number) => {
    onFormChange({ imageUrls: form.imageUrls.filter((_, i) => i !== index) })
  }

  const makeCoverImage = (index: number) => {
    const url = form.imageUrls[index]
    onFormChange({ imageUrls: [url, ...form.imageUrls.filter((_, i) => i !== index)] })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField label="Nome" id="product-name">
        <Input
          id="product-name"
          value={form.name}
          onChange={(e) => onFormChange({ name: e.target.value })}
          required
        />
      </FormField>

      <FormField label="Descrição" id="product-description">
        <Input
          id="product-description"
          value={form.description}
          onChange={(e) => onFormChange({ description: e.target.value })}
        />
      </FormField>

      <FormField label="Categorias" id="product-categories">
        <div className="flex flex-col gap-2">
          {categories.map((c) => (
            <Checkbox
              key={c.id}
              id={`product-category-${c.id}`}
              label={c.name}
              checked={form.categoryIds.includes(c.id)}
              onChange={() => toggleCategory(c.id)}
            />
          ))}
        </div>
      </FormField>

      {form.categoryIds.length > 1 && (
        <FormField label="Categoria principal" id="product-primary-category">
          <Select
            id="product-primary-category"
            value={form.categoryIds[0]}
            onChange={(e) => setPrimaryCategory(e.target.value)}
            options={form.categoryIds.map((id) => ({
              value: id,
              label: categories.find((c) => c.id === id)?.name ?? id,
            }))}
          />
        </FormField>
      )}

      <FormField label="Preço" id="product-price">
        <NumberInput
          id="product-price"
          value={form.price}
          min={0}
          step={0.01}
          onChange={(value) => onFormChange({ price: value })}
        />
      </FormField>

      <FormField
        label={`Imagens (${form.imageUrls.length}/${MAX_IMAGES})`}
        id="product-images"
        hint={
          form.imageUrls.length >= MAX_IMAGES
            ? `Limite de ${MAX_IMAGES} imagens atingido`
            : undefined
        }
      >
        <FileUpload
          accept="image/*"
          multiple
          disabled={form.imageUrls.length >= MAX_IMAGES}
          onChange={handleImagesChange}
        />
      </FormField>

      {form.imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {form.imageUrls.map((url, index) => (
            <div key={url} className="flex w-24 flex-col gap-1">
              <Image
                src={url}
                alt={`Imagem ${index + 1} do produto`}
                aspectRatio="square"
                objectFit="cover"
                className="rounded-md"
              />
              {index === 0 ? (
                <Text size="xs" color="muted" className="text-center">
                  Capa
                </Text>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => makeCoverImage(index)}>
                  Tornar capa
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => removeImage(index)}>
                Remover
              </Button>
            </div>
          ))}
        </div>
      )}

      <FormField label="Slug" id="product-slug" hint="Gerado automaticamente a partir do nome se deixado em branco">
        <Input
          id="product-slug"
          value={form.slug}
          onChange={(e) => onFormChange({ slug: e.target.value })}
        />
      </FormField>

      <FormField label="Meta título" id="product-meta-title">
        <Input
          id="product-meta-title"
          value={form.metaTitle}
          onChange={(e) => onFormChange({ metaTitle: e.target.value })}
        />
      </FormField>

      <FormField label="Meta descrição" id="product-meta-description">
        <Input
          id="product-meta-description"
          value={form.metaDescription}
          onChange={(e) => onFormChange({ metaDescription: e.target.value })}
        />
      </FormField>

      <Card variant="outlined" header="Dados fiscais">
        <div className="flex flex-col gap-4">
          <FormField
            label="NCM"
            id="product-ncm"
            hint="8 dígitos — obrigatório para emitir nota fiscal"
            error={ncmError}
          >
            <Input
              id="product-ncm"
              value={form.ncm}
              maxLength={8}
              onChange={(e) => onFormChange({ ncm: e.target.value })}
            />
          </FormField>

          <FormField label="CFOP" id="product-cfop">
            <Input
              id="product-cfop"
              value={form.cfop}
              maxLength={4}
              onChange={(e) => onFormChange({ cfop: e.target.value })}
            />
          </FormField>

          <FormField label="Unidade comercial" id="product-commercial-unit" hint='Ex.: "UN", "CX", "KG"'>
            <Input
              id="product-commercial-unit"
              value={form.commercialUnit}
              maxLength={6}
              onChange={(e) => onFormChange({ commercialUnit: e.target.value })}
            />
          </FormField>

          <FormField label="GTIN/EAN" id="product-gtin-ean" hint='Deixe "SEM GTIN" se o produto não tiver código de barras'>
            <Input
              id="product-gtin-ean"
              value={form.gtinEan}
              maxLength={14}
              onChange={(e) => onFormChange({ gtinEan: e.target.value })}
            />
          </FormField>

          <FormField label="Origem da mercadoria" id="product-origin">
            <Select
              id="product-origin"
              value={form.origin}
              onChange={(e) => onFormChange({ origin: e.target.value as MerchandiseOrigin })}
              placeholder="Selecione a origem"
              options={MERCHANDISE_ORIGIN_OPTIONS}
            />
          </FormField>
        </div>
      </Card>

      <Card variant="outlined" header="Promoção">
        <div className="flex flex-col gap-4">
          <FormField
            label="Preço promocional"
            id="product-promotional-price"
            error={promotionPriceError}
          >
            <NumberInput
              id="product-promotional-price"
              value={form.promotionalPrice}
              min={0}
              step={0.01}
              onChange={(value) => onFormChange({ promotionalPrice: value })}
            />
          </FormField>

          <FormField label="Início da promoção" id="product-promotion-start" error={promotionDatesError}>
            <input
              id="product-promotion-start"
              type="datetime-local"
              value={form.promotionStartDate}
              onChange={(e) => onFormChange({ promotionStartDate: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FormField>

          <FormField label="Fim da promoção" id="product-promotion-end">
            <input
              id="product-promotion-end"
              type="datetime-local"
              value={form.promotionEndDate}
              onChange={(e) => onFormChange({ promotionEndDate: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FormField>
        </div>
      </Card>

      <IconButton
        type="submit"
        icon="Save"
        label={saveLabel}
        variant="primary"
        isLoading={saving}
        disabled={form.categoryIds.length === 0}
        className="self-start"
      />
    </form>
  )
}
