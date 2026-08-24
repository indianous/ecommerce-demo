'use client'

import { useState } from 'react'
import { Button, FormField, Icon, Input, PasswordInput, Tabs, Text } from 'base-ds'
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

  const emailField = (
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
  )

  const passwordField = (autoComplete: 'current-password' | 'new-password') => (
    <FormField label="Senha" id="auth-password">
      <PasswordInput
        id="auth-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete={autoComplete}
      />
    </FormField>
  )

  return (
    <div>
      <Text color="muted" className="mb-4">
        Para finalizar seu pedido, entre na sua conta ou crie uma nova.
      </Text>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Tabs
          defaultTab={activeTab}
          onChange={(id) => switchTab(id as Tab)}
          tabs={[
            {
              id: 'login',
              label: 'Entrar',
              content: (
                <div className="flex flex-col gap-4">
                  {emailField}
                  {passwordField('current-password')}
                </div>
              ),
            },
            {
              id: 'register',
              label: 'Criar Conta',
              content: (
                <div className="flex flex-col gap-4">
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
                  {emailField}
                  {passwordField('new-password')}
                </div>
              ),
            },
          ]}
        />

        {error && (
          <Text color="destructive" size="sm" role="alert">
            {error}
          </Text>
        )}

        <Button iconOnly leftIcon={<Icon name={activeTab === 'login' ? 'LogIn' : 'UserPlus'} size="sm" />} aria-label={activeTab === 'login' ? 'Entrar' : 'Criar Conta'} type="submit" variant="primary" isLoading={loading} />
      </form>
    </div>
  )
}
