'use client'
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'

interface Props {
  onSuccess: () => void
}

export function RegisterForm({ onSuccess }: Props) {
  const register = useAuthStore((s) => s.register)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
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
    setError('')

    try {
      await register({ name, email, password })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="name">Nome</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          autoComplete="name"
        />
        {nameError && <span>{nameError}</span>}
      </div>

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
      </div>

      <div>
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="new-password"
        />
      </div>

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Carregando...' : 'Cadastrar'}
      </button>
    </form>
  )
}
