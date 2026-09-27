'use client'
import { useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { Button, FormField, Icon, PasswordInput, useToast } from '@indianous/base-ds'
import { useAuthStore } from '@/stores/auth.store'

export function ChangePasswordForm() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { toast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos os campos são obrigatórios')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setIsLoading(true)
    try {
      const res = await authFetch('/api/auth/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })

      if (res.ok) {
        toast({ description: 'Senha alterada com sucesso' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await res.json()
        setError(data.message ?? 'Erro ao alterar a senha')
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <FormField label="Senha atual" id="currentPassword">
        <PasswordInput
          showLabel="Mostrar senha"
          hideLabel="Ocultar senha"
          id="currentPassword"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="current-password"
        />
      </FormField>

      <FormField label="Nova senha" id="newPassword">
        <PasswordInput
          showLabel="Mostrar senha"
          hideLabel="Ocultar senha"
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="new-password"
        />
      </FormField>

      <FormField label="Confirmar nova senha" id="confirmPassword">
        <PasswordInput
          showLabel="Mostrar senha"
          hideLabel="Ocultar senha"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="new-password"
        />
      </FormField>

      <Button leftIcon={<Icon name="KeyRound" size="sm" />} type="submit" variant="primary" isLoading={isLoading}>Alterar senha</Button>
    </form>
  )
}
