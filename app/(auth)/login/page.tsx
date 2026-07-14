'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heading, Text } from 'base-ds'
import { LoginForm } from '@/components/forms/LoginForm'

export default function LoginPage() {
  const router = useRouter()

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <Heading as="h1" size="2xl">
        Entrar
      </Heading>

      <LoginForm onSuccess={() => router.push('/catalog')} />

      <Text size="sm" color="muted">
        Não tem conta?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Cadastre-se
        </Link>
      </Text>
    </main>
  )
}
