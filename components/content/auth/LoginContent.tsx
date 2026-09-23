'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Container, Heading, Text } from 'base-ds'
import { LoginForm } from '@/components/forms/LoginForm'
import { postLoginPath } from '@/lib/post-login-path'
import { useAuthStore } from '@/stores/auth.store'

export function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')
  const sessionExpired = searchParams.get('sessionExpired') === '1'

  const handleSuccess = () => {
    router.push(postLoginPath(callbackUrl, useAuthStore.getState().role))
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

      <LoginForm onSuccess={handleSuccess} />

      <Text size="sm" color="muted">
        Não tem conta?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Cadastre-se
        </Link>
      </Text>
    </Container>
  )
}
