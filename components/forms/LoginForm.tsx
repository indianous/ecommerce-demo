'use client'
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'

interface Props {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: Props) {
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
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
    setError('')

    try {
      await login({ email, password })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoComplete="email"
        />
        {emailError && <span>{emailError}</span>}
      </div>

      <div>
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="current-password"
        />
      </div>

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Carregando...' : 'Entrar'}
      </button>
    </form>
  )
}
