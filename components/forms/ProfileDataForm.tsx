'use client'

import { useState } from 'react'
import { Button, FormField, Icon, Input, Select } from 'base-ds'
import type { Gender } from '@/types'

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'NAO_BINARIO', label: 'Não-binário' },
  { value: 'PREFIRO_NAO_DIZER', label: 'Prefiro não dizer' },
]

type Props = {
  name: string
  email: string
  phone: string
  birthDate: string
  gender: Gender
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onBirthDateChange: (value: string) => void
  onGenderChange: (value: Gender) => void
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
}

export function ProfileDataForm({
  name,
  email,
  phone,
  birthDate,
  gender,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onBirthDateChange,
  onGenderChange,
  onSubmit,
  saving,
}: Props) {
  const [birthDateError, setBirthDateError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (birthDate && birthDate > new Date().toISOString().slice(0, 10)) {
      setBirthDateError('Data de nascimento não pode ser no futuro')
      return
    }
    setBirthDateError('')
    onSubmit(e)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField label="Nome" id="profile-name">
        <Input id="profile-name" value={name} onChange={(e) => onNameChange(e.target.value)} />
      </FormField>
      <FormField label="Email" id="profile-email">
        <Input id="profile-email" type="email" value={email} onChange={(e) => onEmailChange(e.target.value)} />
      </FormField>
      <FormField label="Telefone" id="profile-phone" hint="Opcional">
        <Input id="profile-phone" type="tel" value={phone} onChange={(e) => onPhoneChange(e.target.value)} />
      </FormField>
      <FormField
        label="Data de nascimento"
        id="profile-birth-date"
        hint={birthDateError ? undefined : 'Opcional'}
        error={birthDateError || undefined}
      >
        <Input
          id="profile-birth-date"
          type="date"
          value={birthDate}
          onChange={(e) => onBirthDateChange(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
        />
      </FormField>
      <FormField label="Gênero" id="profile-gender" hint="Opcional">
        <Select
          id="profile-gender"
          value={gender}
          onChange={(e) => onGenderChange(e.target.value as Gender)}
          options={GENDER_OPTIONS}
        />
      </FormField>
      <Button iconOnly leftIcon={<Icon name="Save" size="sm" />} aria-label="Salvar" type="submit" variant="primary" isLoading={saving} className="self-start" />
    </form>
  )
}
