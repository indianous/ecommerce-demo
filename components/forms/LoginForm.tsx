'use client'
import { useState } from 'react'
import { FormField, Input, PasswordInput, useToast } from 'base-ds'
import { IconButton } from '@/components/ui/IconButton'
import { useAuthStore } from '@/stores/auth.store'

interface Props {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: Props) {
  const login = useAuthStore((s) => s.login)
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validate = () => {
    if (!email.trim()) {
      setEmailError('Email é obrigatório')
      return false
    }
    setEmailError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)

    try {
      await login({ email, password })
      onSuccess()
    } catch (err) {
      toast({
        variant: 'destructive',
        description: err instanceof Error ? err.message : 'Credenciais inválidas',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormField label="Email" id="email" error={emailError}>
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
          autoComplete="current-password"
        />
      </FormField>

      <IconButton type="submit" icon="LogIn" label="Entrar" variant="primary" isLoading={isLoading} />
    </form>
  )
}
