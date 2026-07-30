'use client'

import { Button, FormField, Input } from 'base-ds'

type Props = {
  name: string
  email: string
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
}

export function ProfileDataForm({ name, email, onNameChange, onEmailChange, onSubmit, saving }: Props) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormField label="Nome" id="profile-name">
        <Input id="profile-name" value={name} onChange={(e) => onNameChange(e.target.value)} />
      </FormField>
      <FormField label="Email" id="profile-email">
        <Input id="profile-email" type="email" value={email} onChange={(e) => onEmailChange(e.target.value)} />
      </FormField>
      <Button type="submit" isLoading={saving} className="self-start">
        Salvar
      </Button>
    </form>
  )
}
