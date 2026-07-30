'use client'

import { Button, FileUpload, FormField, Input, NumberInput, Select } from 'base-ds'
import type { Category } from '@/types'

export type ProductFormState = {
  name: string
  description: string
  price: number
  stockQuantity: number
  categoryId: string
  imageUrl: string
}

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '',
  description: '',
  price: 0,
  stockQuantity: 0,
  categoryId: '',
  imageUrl: '',
}

type ProductFormProps = {
  form: ProductFormState
  onFormChange: (patch: Partial<ProductFormState>) => void
  categories: Category[]
  editingId: string | null
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
  accessToken: string | null
}

export function ProductForm({
  form,
  onFormChange,
  categories,
  saving,
  onSubmit,
  accessToken,
}: ProductFormProps) {
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

      <FormField label="Categoria" id="product-category">
        <Select
          id="product-category"
          value={form.categoryId}
          onChange={(e) => onFormChange({ categoryId: e.target.value })}
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
          onChange={(value) => onFormChange({ price: value })}
        />
      </FormField>

      <FormField label="Estoque" id="product-stock">
        <NumberInput
          id="product-stock"
          value={form.stockQuantity}
          min={0}
          onChange={(value) => onFormChange({ stockQuantity: value })}
        />
      </FormField>

      <FormField label="Imagem" id="product-image">
        <FileUpload
          accept="image/*"
          onChange={async ([file]) => {
            if (!file) return
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/upload/image', {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}` },
              body: fd,
            })
            if (res.ok) {
              const { url } = await res.json()
              onFormChange({ imageUrl: url })
            }
          }}
        />
      </FormField>

      {form.imageUrl && (
        <img src={form.imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-md" />
      )}

      <Button type="submit" isLoading={saving} className="self-start">
        Salvar
      </Button>
    </form>
  )
}
