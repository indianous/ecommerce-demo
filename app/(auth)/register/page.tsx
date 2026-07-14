'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heading, Text } from 'base-ds'
import { RegisterForm } from '@/components/forms/RegisterForm'

export default function RegisterPage() {
  const router = useRouter()

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <Heading as="h1" size="2xl">
        Cadastro
      </Heading>

      <RegisterForm onSuccess={() => router.push('/catalog')} />

      <Text size="sm" color="muted">
        Já tem conta?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </Text>
    </main>
  )
}
