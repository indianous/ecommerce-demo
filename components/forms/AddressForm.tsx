'use client'

import { Button, FormField, Input } from 'base-ds'
import type { Address } from '@/types'

export type NewAddress = Omit<Address, 'id' | 'isDefault'>

export const EMPTY_ADDRESS: NewAddress = {
  street: '',
  number: '',
  district: '',
  city: '',
  state: '',
  zipCode: '',
}

type Props = {
  address: NewAddress
  onChange: (patch: Partial<NewAddress>) => void
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
}

export function AddressForm({ address, onChange, onSubmit, saving }: Props) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
      <FormField label="Rua/Logradouro" id="address-street" className="col-span-2">
        <Input
          id="address-street"
          value={address.street}
          onChange={(e) => onChange({ street: e.target.value })}
          required
        />
      </FormField>
      <FormField label="Número" id="address-number">
        <Input
          id="address-number"
          value={address.number}
          onChange={(e) => onChange({ number: e.target.value })}
          required
        />
      </FormField>
      <FormField label="Bairro" id="address-district">
        <Input
          id="address-district"
          value={address.district}
          onChange={(e) => onChange({ district: e.target.value })}
          required
        />
      </FormField>
      <FormField label="Cidade" id="address-city">
        <Input
          id="address-city"
          value={address.city}
          onChange={(e) => onChange({ city: e.target.value })}
          required
        />
      </FormField>
      <FormField label="Estado" id="address-state">
        <Input
          id="address-state"
          value={address.state}
          onChange={(e) => onChange({ state: e.target.value })}
          required
        />
      </FormField>
      <FormField label="CEP" id="address-zip" className="col-span-2">
        <Input
          id="address-zip"
          value={address.zipCode}
          onChange={(e) => onChange({ zipCode: e.target.value })}
          required
        />
      </FormField>
      <Button type="submit" isLoading={saving} className="col-span-2 self-start">
        Adicionar endereço
      </Button>
    </form>
  )
}
