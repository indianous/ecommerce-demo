'use client'

import { useState } from 'react'
import { FormField, Input, PasswordInput, Text } from 'base-ds'
import { IconButton } from '@/components/ui/IconButton'
import { useAuthStore } from '@/stores/auth.store'

type Tab = 'login' | 'register'

export function CheckoutAuth() {
  const [activeTab, setActiveTab] = useState<Tab>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, register } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (activeTab === 'login') {
        await login({ email, password })
      } else {
        await register({ name, email, password })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
    setError('')
  }

  return (
    <div>
      <Text color="muted" className="mb-4">
        Para finalizar seu pedido, entre na sua conta ou crie uma nova.
      </Text>

      <div role="tablist" className="mb-6 flex border-b">
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === 'login'}
          onClick={() => switchTab('login')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'login'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Entrar
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === 'register'}
          onClick={() => switchTab('register')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'register'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Criar Conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {activeTab === 'register' && (
          <FormField label="Nome" id="auth-name">
            <Input
              id="auth-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </FormField>
        )}

        <FormField label="E-mail" id="auth-email">
          <Input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </FormField>

        <FormField label="Senha" id="auth-password">
          <PasswordInput
            id="auth-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
          />
        </FormField>

        {error && (
          <Text color="danger" size="sm" role="alert">
            {error}
          </Text>
        )}

        <IconButton
          type="submit"
          icon={activeTab === 'login' ? 'LogIn' : 'UserPlus'}
          label={activeTab === 'login' ? 'Entrar' : 'Criar Conta'}
          variant="primary"
          isLoading={loading}
        />
      </form>
    </div>
  )
}
