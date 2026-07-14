'use client'
import { useState } from 'react'
import { Button, FormField, Input, PasswordInput, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'

interface Props {
  onSuccess: () => void
}

export function RegisterForm({ onSuccess }: Props) {
  const register = useAuthStore((s) => s.register)
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      await register({ name, email, password })
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

      <Button type="submit" disabled={isLoading} isLoading={isLoading}>
        {isLoading ? 'Carregando...' : 'Cadastrar'}
      </Button>
    </form>
  )
}
