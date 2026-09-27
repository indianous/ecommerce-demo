'use client'
import { useState } from 'react'
import { Button, FormField, Icon, Input, PasswordInput, useToast } from '@indianous/base-ds'
import { useAuthStore } from '@/stores/auth.store'
import type { LoginResult } from '@/types'

interface Props {
  /** Senha certa: sessão aberta, ou a segunda etapa que falta (2FA). */
  onSuccess: (result: LoginResult, email: string) => void
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
      const result = await login({ email, password })
      onSuccess(result, email)
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

      <Button leftIcon={<Icon name="LogIn" size="sm" />} type="submit" variant="primary" isLoading={isLoading}>Entrar</Button>
    </form>
  )
}
