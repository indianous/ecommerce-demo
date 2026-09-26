'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Container, Heading, Icon, Skeleton, Text } from 'base-ds'
import { ResetPasswordForm } from '@/components/forms/ResetPasswordForm'
import type { PasswordTokenInfo } from '@/types'

type State = { kind: 'loading' } | { kind: 'ready'; info: PasswordTokenInfo } | { kind: 'invalid' } | { kind: 'expired' }

const EXPIRED_TITLE = 'Este link expirou ou já foi usado'

/**
 * "Redefinir senha" (link do esqueci minha senha) e "Definir sua senha" (convite). O token sai da URL logo
 * depois de lido e fica só em memória: não vaza no histórico nem no Referer.
 */
export function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token] = useState(() => searchParams.get('token'))
  const [state, setState] = useState<State>(token ? { kind: 'loading' } : { kind: 'invalid' })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | undefined>()

  // Uma leitura por token: o efeito não depende do router, para não reler o link a cada render.
  const routerRef = useRef(router)

  useEffect(() => {
    if (!token) return
    routerRef.current.replace('/reset-password')
    let cancelled = false
    fetch(`/api/auth/password-tokens/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (cancelled) return
        if (res.ok) setState({ kind: 'ready', info: await res.json() })
        else setState({ kind: res.status === 410 ? 'expired' : 'invalid' })
      })
      .catch(() => !cancelled && setState({ kind: 'invalid' }))
    return () => {
      cancelled = true
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSubmitting(true)
    setError(undefined)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password, confirmPassword }),
      })
      if (res.ok) {
        router.push('/login?passwordReset=1')
        return
      }
      if (res.status === 410) {
        setState({ kind: 'expired' })
        return
      }
      const data = await res.json().catch(() => null)
      setError(data?.message ?? 'Não foi possível salvar a senha. Tente novamente.')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (state.kind === 'loading') {
    return (
      <Container width="sm" spacing="loose" role="status" aria-label="Carregando">
        <Skeleton variant="line" height={40} className="mb-2" />
        <Skeleton variant="line" height={40} />
      </Container>
    )
  }

  if (state.kind === 'invalid' || state.kind === 'expired') {
    return (
      <Container width="sm" spacing="loose" className="flex flex-col gap-6">
        <Heading as="h1" size="2xl">
          {state.kind === 'expired' ? EXPIRED_TITLE : 'Link inválido'}
        </Heading>
        <Text color="muted">Peça um novo link para escolher a sua senha.</Text>
        <div>
          <Button leftIcon={<Icon name="Mail" size="sm" />} as="a" href="/forgot-password" variant="primary">
            Pedir um novo link
          </Button>
        </div>
      </Container>
    )
  }

  const isInvite = state.info.purpose === 'SET_PASSWORD'

  return (
    <Container width="sm" spacing="loose" className="flex flex-col gap-6">
      <Heading as="h1" size="2xl">
        {isInvite ? 'Definir sua senha' : 'Redefinir senha'}
      </Heading>
      {isInvite && (
        <Text>Boas-vindas! Uma conta foi criada para você. Escolha uma senha para entrar.</Text>
      )}
      <Text size="sm" color="muted">
        Conta: {state.info.email}
      </Text>
      <ResetPasswordForm
        password={password}
        confirmPassword={confirmPassword}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Salvar senha"
        error={error}
      />
      <Text size="sm">
        <Link href="/login" className="text-primary hover:underline">
          Voltar para o login
        </Link>
      </Text>
    </Container>
  )
}
