'use client'
import { useState } from 'react'
import { Button, FormField, Icon, Input, PasswordInput, Select, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { readAttribution } from '@/lib/traffic-attribution'
import type { Gender } from '@/types'

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'NAO_BINARIO', label: 'Não-binário' },
  { value: 'PREFIRO_NAO_DIZER', label: 'Prefiro não dizer' },
]

interface Props {
  onSuccess: () => void
}

export function RegisterForm({ onSuccess }: Props) {
  const register = useAuthStore((s) => s.register)
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [nameError, setNameError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validate = () => {
    if (!name.trim()) {
      setNameError('Nome é obrigatório')
      return false
    }
    setNameError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)

    try {
      await register({
        name,
        email,
        password,
        phone: phone || undefined,
        birthDate: birthDate || undefined,
        gender: gender || undefined,
        ...readAttribution(),
      })
      onSuccess()
    } catch (err) {
      toast({
        variant: 'destructive',
        description: err instanceof Error ? err.message : 'Erro ao cadastrar',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormField label="Nome" id="name" error={nameError}>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          autoComplete="name"
        />
      </FormField>

      <FormField label="Email" id="email">
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoComplete="email"
        />
      </FormField>

      <FormField label="Senha" id="password">
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="new-password"
        />
      </FormField>

      <FormField label="Telefone" id="phone" hint="Opcional">
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isLoading}
          autoComplete="tel"
        />
      </FormField>

      <FormField label="Data de nascimento" id="birthDate" hint="Opcional">
        <Input
          id="birthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          disabled={isLoading}
          max={new Date().toISOString().slice(0, 10)}
        />
      </FormField>

      <FormField label="Gênero" id="gender" hint="Opcional">
        <Select
          id="gender"
          value={gender}
          onChange={(e) => setGender(e.target.value as Gender | '')}
          disabled={isLoading}
          placeholder="Selecione"
          options={GENDER_OPTIONS}
        />
      </FormField>

      <Button leftIcon={<Icon name="UserPlus" size="sm" />} type="submit" variant="primary" isLoading={isLoading}>Cadastrar</Button>
    </form>
  )
}
