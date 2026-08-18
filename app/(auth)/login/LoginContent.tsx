'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heading, Text } from 'base-ds'
import { LoginForm } from '@/components/forms/LoginForm'
import { useAuthStore } from '@/stores/auth.store'

export function LoginContent() {
  const router = useRouter()

  const handleSuccess = () => {
    const role = useAuthStore.getState().role
    if (role === 'ADMIN') router.push('/dashboard/admin')
    else if (role === 'EMPLOYEE') router.push('/dashboard')
    else router.push('/')
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <Heading as="h1" size="2xl">
        Entrar
      </Heading>

      <LoginForm onSuccess={handleSuccess} />

      <Text size="sm" color="muted">
        Não tem conta?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Cadastre-se
        </Link>
      </Text>
    </main>
  )
}
