'use client'

import { Button, FormField, Icon, Input } from '@indianous/base-ds'

export type DistributionCenterFormState = {
  name: string
  phone: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
  zipCode: string
}

export const EMPTY_DISTRIBUTION_CENTER_FORM: DistributionCenterFormState = {
  name: '',
  phone: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  zipCode: '',
}

type Props = {
  form: DistributionCenterFormState
  onFormChange: (patch: Partial<DistributionCenterFormState>) => void
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
  saveLabel?: string
}

export function DistributionCenterForm({ form, onFormChange, onSubmit, saving, saveLabel = 'Salvar' }: Props) {
  const canSubmit =
    form.name.trim() !== '' &&
    form.street.trim() !== '' &&
    form.number.trim() !== '' &&
    form.district.trim() !== '' &&
    form.city.trim() !== '' &&
    form.state.trim().length === 2 &&
    form.zipCode.trim() !== ''

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
      <FormField label="Nome" id="dc-name" className="col-span-2">
        <Input id="dc-name" value={form.name} onChange={(e) => onFormChange({ name: e.target.value })} required />
      </FormField>
      <FormField label="Telefone" id="dc-phone" className="col-span-2">
        <Input id="dc-phone" value={form.phone} onChange={(e) => onFormChange({ phone: e.target.value })} />
      </FormField>
      <FormField label="Rua/Logradouro" id="dc-street" className="col-span-2">
        <Input id="dc-street" value={form.street} onChange={(e) => onFormChange({ street: e.target.value })} required />
      </FormField>
      <FormField label="Número" id="dc-number">
        <Input id="dc-number" value={form.number} onChange={(e) => onFormChange({ number: e.target.value })} required />
      </FormField>
      <FormField label="Complemento" id="dc-complement">
        <Input id="dc-complement" value={form.complement} onChange={(e) => onFormChange({ complement: e.target.value })} />
      </FormField>
      <FormField label="Bairro" id="dc-district">
        <Input id="dc-district" value={form.district} onChange={(e) => onFormChange({ district: e.target.value })} required />
      </FormField>
      <FormField label="Cidade" id="dc-city">
        <Input id="dc-city" value={form.city} onChange={(e) => onFormChange({ city: e.target.value })} required />
      </FormField>
      <FormField label="Estado" id="dc-state">
        <Input id="dc-state" value={form.state} onChange={(e) => onFormChange({ state: e.target.value.toUpperCase() })} maxLength={2} required />
      </FormField>
      <FormField label="CEP" id="dc-zip">
        <Input id="dc-zip" value={form.zipCode} onChange={(e) => onFormChange({ zipCode: e.target.value })} required />
      </FormField>
      <Button leftIcon={<Icon name="Save" size="sm" />} type="submit" variant="primary" isLoading={saving} disabled={!canSubmit} className="col-span-2 self-start">{saveLabel}</Button>
    </form>
  )
}
