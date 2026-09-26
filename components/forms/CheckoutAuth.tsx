'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Alert, Button, FormField, Icon, Input, PasswordInput, Tabs, Text } from 'base-ds'
import { MfaCodeForm } from '@/components/forms/MfaCodeForm'
import { AuthError, useAuthStore } from '@/stores/auth.store'

type Tab = 'login' | 'register'
/** form: e-mail e senha. mfa: cliente com 2FA digita o código. staff: conta da equipe, que entra pelo /login. */
type Step = 'form' | 'mfa' | 'staff'

export function CheckoutAuth() {
  const [activeTab, setActiveTab] = useState<Tab>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('form')
  const [mfaMode, setMfaMode] = useState<'code' | 'recovery'>('code')
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>()

  const { login, register, verifyMfa, verifyRecoveryCode, cancelMfa } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (activeTab === 'login') {
        const result = await login({ email, password })
        if (result.status === 'mfaRequired') {
          setStep('mfa')
        } else if (result.status === 'mfaSetupRequired') {
          // a configuração obrigatória é da equipe e acontece no /login
          cancelMfa()
          setStep('staff')
        }
      } else {
        await register({ name, email, password })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const backToForm = (message = '') => {
    cancelMfa()
    setStep('form')
    setMfaMode('code')
    setCode('')
    setRecoveryCode('')
    setAttemptsRemaining(undefined)
    setError(message)
  }

  const handleVerify = async (value: string) => {
    setError('')
    setLoading(true)
    try {
      // com a sessão aberta, o checkout troca este componente pelo formulário do pedido
      await (mfaMode === 'code' ? verifyMfa(value) : verifyRecoveryCode(value))
    } catch (err) {
      if (err instanceof AuthError && (err.status === 410 || err.attemptsRemaining === 0)) {
        backToForm(err.status === 410 ? err.message : 'Muitas tentativas com código errado. Entre de novo com a senha.')
        return
      }
      setError(err instanceof Error ? err.message : 'Código inválido')
      setAttemptsRemaining(err instanceof AuthError ? err.attemptsRemaining : undefined)
      setCode('')
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

  if (step === 'staff') {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="info">
          <Text>Esta é uma conta da equipe, que precisa configurar a verificação em duas etapas antes de entrar.</Text>
          <Link href="/login" className="text-primary hover:underline">
            Entre pelo login da equipe
          </Link>
        </Alert>
        <Button type="button" variant="ghost" leftIcon={<Icon name="ArrowLeft" size="sm" />} onClick={() => backToForm()}>
          Voltar
        </Button>
      </div>
    )
  }

  if (step === 'mfa') {
    return (
      <div className="flex flex-col gap-4">
        <Text color="muted">
          {mfaMode === 'code'
            ? 'Digite o código do seu app autenticador para continuar.'
            : 'Digite um dos seus códigos de recuperação para continuar.'}
        </Text>
        <MfaCodeForm
          mode={mfaMode}
          code={code}
          recoveryCode={recoveryCode}
          onCodeChange={setCode}
          onRecoveryCodeChange={setRecoveryCode}
          onSubmit={handleVerify}
          onToggleMode={() => {
            setMfaMode(mfaMode === 'code' ? 'recovery' : 'code')
            setError('')
          }}
          submitting={loading}
          error={error || undefined}
          attemptsRemaining={attemptsRemaining}
        />
        <Button type="button" variant="ghost" leftIcon={<Icon name="ArrowLeft" size="sm" />} onClick={() => backToForm()}>
          Voltar
        </Button>
      </div>
    )
  }

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

        <Button leftIcon={<Icon name={activeTab === 'login' ? 'LogIn' : 'UserPlus'} size="sm" />} type="submit" variant="primary" isLoading={loading}>{activeTab === 'login' ? 'Entrar' : 'Criar Conta'}</Button>
      </form>
    </div>
  )
}
