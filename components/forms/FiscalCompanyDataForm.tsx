'use client'

import { useState } from 'react'
import { Button, FormField, Icon, Input, Select } from 'base-ds'
import type { FiscalCompanyData, TaxRegime } from '@/types'

const TAX_REGIME_OPTIONS: { value: TaxRegime; label: string }[] = [
  { value: 'SIMPLES_NACIONAL', label: 'Simples Nacional' },
  { value: 'LUCRO_PRESUMIDO', label: 'Lucro Presumido' },
  { value: 'LUCRO_REAL', label: 'Lucro Real' },
]

export const EMPTY_FISCAL_COMPANY_DATA: FiscalCompanyData = {
  cnpj: '',
  legalName: '',
  tradeName: '',
  stateRegistration: '',
  taxRegime: 'SIMPLES_NACIONAL',
  street: '',
  number: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  email: '',
  phone: '',
}

export function isValidCnpj(rawCnpj: string): boolean {
  const cnpj = rawCnpj.replace(/\D/g, '')
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false

  const calculateDigit = (base: string, weights: number[]) => {
    const sum = base
      .split('')
      .reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const weightsFirst = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weightsSecond = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const firstDigit = calculateDigit(cnpj.slice(0, 12), weightsFirst)
  const secondDigit = calculateDigit(cnpj.slice(0, 12) + firstDigit, weightsSecond)

  return cnpj === cnpj.slice(0, 12) + String(firstDigit) + String(secondDigit)
}

type Props = {
  data: FiscalCompanyData
  onChange: (patch: Partial<FiscalCompanyData>) => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
}

export function FiscalCompanyDataForm({ data, onChange, onSave, saving, saveLabel = 'Salvar' }: Props) {
  const [submitted, setSubmitted] = useState(false)

  const cnpjValid = isValidCnpj(data.cnpj)
  const cnpjError = submitted && !cnpjValid ? 'CNPJ inválido' : undefined

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!cnpjValid) return
    onSave()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="CNPJ" id="fiscal-company-cnpj" error={cnpjError}>
        <Input
          id="fiscal-company-cnpj"
          value={data.cnpj}
          onChange={(e) => onChange({ cnpj: e.target.value })}
          required
        />
      </FormField>

      <FormField label="Razão social" id="fiscal-company-legal-name">
        <Input
          id="fiscal-company-legal-name"
          value={data.legalName}
          onChange={(e) => onChange({ legalName: e.target.value })}
          required
        />
      </FormField>

      <FormField label="Nome fantasia" id="fiscal-company-trade-name">
        <Input
          id="fiscal-company-trade-name"
          value={data.tradeName ?? ''}
          onChange={(e) => onChange({ tradeName: e.target.value })}
        />
      </FormField>

      <FormField label="Inscrição estadual" id="fiscal-company-state-registration">
        <Input
          id="fiscal-company-state-registration"
          value={data.stateRegistration ?? ''}
          onChange={(e) => onChange({ stateRegistration: e.target.value })}
        />
      </FormField>

      <FormField label="Regime tributário" id="fiscal-company-tax-regime">
        <Select
          id="fiscal-company-tax-regime"
          value={data.taxRegime}
          onChange={(e) => onChange({ taxRegime: e.target.value as TaxRegime })}
          options={TAX_REGIME_OPTIONS}
          required
        />
      </FormField>

      <FormField label="Rua/Logradouro" id="fiscal-company-street">
        <Input
          id="fiscal-company-street"
          value={data.street}
          onChange={(e) => onChange({ street: e.target.value })}
          required
        />
      </FormField>

      <FormField label="Número" id="fiscal-company-number">
        <Input
          id="fiscal-company-number"
          value={data.number}
          onChange={(e) => onChange({ number: e.target.value })}
          required
        />
      </FormField>

      <FormField label="Bairro" id="fiscal-company-neighborhood">
        <Input
          id="fiscal-company-neighborhood"
          value={data.neighborhood}
          onChange={(e) => onChange({ neighborhood: e.target.value })}
          required
        />
      </FormField>

      <FormField label="Cidade" id="fiscal-company-city">
        <Input
          id="fiscal-company-city"
          value={data.city}
          onChange={(e) => onChange({ city: e.target.value })}
          required
        />
      </FormField>

      <FormField label="Estado" id="fiscal-company-state">
        <Input
          id="fiscal-company-state"
          value={data.state}
          onChange={(e) => onChange({ state: e.target.value })}
          required
        />
      </FormField>

      <FormField label="CEP" id="fiscal-company-zip-code">
        <Input
          id="fiscal-company-zip-code"
          value={data.zipCode}
          onChange={(e) => onChange({ zipCode: e.target.value })}
          required
        />
      </FormField>

      <FormField label="E-mail" id="fiscal-company-email">
        <Input
          id="fiscal-company-email"
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          required
        />
      </FormField>

      <FormField label="Telefone" id="fiscal-company-phone">
        <Input
          id="fiscal-company-phone"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          required
        />
      </FormField>

      <Button leftIcon={<Icon name="Save" size="sm" />} type="submit" variant="primary" isLoading={saving} className="self-start">{saveLabel}</Button>
    </form>
  )
}
