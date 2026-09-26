'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert, Button, Container, Heading, Icon, Text, useToast } from 'base-ds'
import { MfaSetupPanel } from '@/components/auth/MfaSetupPanel'
import { RecoveryCodesPanel } from '@/components/auth/RecoveryCodesPanel'
import { LoginForm } from '@/components/forms/LoginForm'
import { MfaCodeForm } from '@/components/forms/MfaCodeForm'
import { postLoginPath } from '@/lib/post-login-path'
import { AuthError, useAuthStore } from '@/stores/auth.store'
import type { LoginResult, MfaSetupInfo } from '@/types'

type Step = 'credentials' | 'mfa' | 'setup' | 'recoveryCodes'

/** Abaixo disso, avisa para gerar códigos novos no perfil. */
const LOW_RECOVERY_CODES = 3

export function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const callbackUrl = searchParams.get('callbackUrl')
  const sessionExpired = searchParams.get('sessionExpired') === '1'
  const passwordReset = searchParams.get('passwordReset') === '1'

  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState<string>()
  // etapa do código
  const [mode, setMode] = useState<'code' | 'recovery'>('code')
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>()
  // configuração obrigatória
  const [setup, setSetup] = useState<MfaSetupInfo | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  const redirect = () => router.push(postLoginPath(callbackUrl, useAuthStore.getState().role))

  const backToCredentials = (message?: string) => {
    useAuthStore.getState().cancelMfa()
    setStep('credentials')
    setNotice(message)
    setMode('code')
    setCode('')
    setRecoveryCode('')
    setError(undefined)
    setAttemptsRemaining(undefined)
    setSetup(null)
  }

  /** 410 ou tentativas esgotadas: o mfaToken não vale mais e a pessoa volta para a senha. */
  const expiredChallenge = (err: unknown) => {
    if (err instanceof AuthError && err.status === 410) {
      backToCredentials(err.message)
      return true
    }
    if (err instanceof AuthError && err.attemptsRemaining === 0) {
      backToCredentials('Muitas tentativas com código errado. Entre de novo com a senha.')
      return true
    }
    return false
  }

  /** O resto dos erros fica na etapa do código, com a mensagem e as tentativas restantes. */
  const handleMfaError = (err: unknown) => {
    if (expiredChallenge(err)) return
    setError(err instanceof Error ? err.message : 'Não foi possível confirmar o código')
    setAttemptsRemaining(err instanceof AuthError ? err.attemptsRemaining : undefined)
    setCode('')
  }

  const handleCredentials = async (result: LoginResult, loginEmail: string) => {
    setEmail(loginEmail)
    setNotice(undefined)
    if (result.status === 'authenticated') {
      redirect()
      return
    }
    if (result.status === 'mfaRequired') {
      setStep('mfa')
      return
    }
    setStep('setup')
    try {
      setSetup(await useAuthStore.getState().startMfaSetup())
    } catch (err) {
      backToCredentials(err instanceof Error ? err.message : undefined)
    }
  }

  const handleVerify = async (value: string) => {
    setSubmitting(true)
    setError(undefined)
    try {
      const store = useAuthStore.getState()
      const { recoveryCodesRemaining } =
        mode === 'code' ? await store.verifyMfa(value) : await store.verifyRecoveryCode(value)
      if (mode === 'recovery' && recoveryCodesRemaining !== undefined && recoveryCodesRemaining <= LOW_RECOVERY_CODES) {
        toast({
          variant: 'warning',
          description: `Restam ${recoveryCodesRemaining} códigos de recuperação — gere novos no seu perfil`,
        })
      }
      redirect()
    } catch (err) {
      handleMfaError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRecoveryCodesSaved = async () => {
    await useAuthStore.getState().acknowledgeRecoveryCodes()
    redirect()
  }

  const backButton = (
    <Button type="button" variant="ghost" leftIcon={<Icon name="ArrowLeft" size="sm" />} onClick={() => backToCredentials()}>
      Voltar
    </Button>
  )

  if (step === 'mfa') {
    return (
      <Container width="sm" spacing="loose" className="flex flex-col gap-6">
        <Heading as="h1" size="2xl">
          Verificação em duas etapas
        </Heading>
        <Text>
          {mode === 'code'
            ? 'Digite o código do seu app autenticador para entrar como'
            : 'Digite um dos seus códigos de recuperação para entrar como'}{' '}
          <strong>{email}</strong>
        </Text>
        <MfaCodeForm
          mode={mode}
          code={code}
          recoveryCode={recoveryCode}
          onCodeChange={setCode}
          onRecoveryCodeChange={setRecoveryCode}
          onSubmit={handleVerify}
          onToggleMode={() => {
            setMode(mode === 'code' ? 'recovery' : 'code')
            setError(undefined)
          }}
          submitting={submitting}
          error={error}
          attemptsRemaining={attemptsRemaining}
        />
        {backButton}
      </Container>
    )
  }

  if (step === 'setup') {
    return (
      <Container width="sm" spacing="loose" className="flex flex-col gap-6">
        <Heading as="h1" size="2xl">
          Configure a verificação em duas etapas
        </Heading>
        <Text>
          Para proteger o painel, configure a verificação em duas etapas. Depois disso, o login de{' '}
          <strong>{email}</strong> pede também o código do app.
        </Text>
        <MfaSetupPanel
          setup={setup}
          onConfirm={async (value) => {
            try {
              setRecoveryCodes(await useAuthStore.getState().confirmMfaSetup(value))
              setStep('recoveryCodes')
            } catch (err) {
              if (!expiredChallenge(err)) throw err
            }
          }}
        />
        {backButton}
      </Container>
    )
  }

  if (step === 'recoveryCodes') {
    return (
      <Container width="sm" spacing="loose" className="flex flex-col gap-6">
        <Heading as="h1" size="2xl">
          Códigos de recuperação
        </Heading>
        <RecoveryCodesPanel codes={recoveryCodes} onContinue={handleRecoveryCodesSaved} />
      </Container>
    )
  }

  return (
    <Container width="sm" spacing="loose" className="flex flex-col gap-6">
      <Heading as="h1" size="2xl">
        Entrar
      </Heading>

      {sessionExpired && (
        <Text size="sm" color="destructive">
          Sua sessão expirou — faça login de novo.
        </Text>
      )}

      {passwordReset && <Alert variant="success">Senha alterada. Entre com a nova senha.</Alert>}

      {notice && <Alert variant="warning">{notice}</Alert>}

      <LoginForm onSuccess={handleCredentials} />

      <Text size="sm">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Esqueci minha senha
        </Link>
      </Text>

      <Text size="sm" color="muted">
        Não tem conta?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Cadastre-se
        </Link>
      </Text>
    </Container>
  )
}
