'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Container, Heading, Text } from 'base-ds'
import { RegisterForm } from '@/components/forms/RegisterForm'

export function RegisterContent() {
  const router = useRouter()

  return (
    <Container width="sm" spacing="loose" className="flex flex-col gap-6">
      <Heading as="h1" size="2xl">
        Cadastro
      </Heading>

      <RegisterForm onSuccess={() => router.push('/')} />

      <Text size="sm" color="muted">
        Já tem conta?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </Text>
    </Container>
  )
}
