'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Alert, Container, Heading, Text, useToast } from 'base-ds'
import { RegisterForm } from '@/components/forms/RegisterForm'

export function RegisterContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [passwordNotSet, setPasswordNotSet] = useState<string | null>(null)

  const handleSuccess = (email: string) => {
    toast({ variant: 'success', description: `Enviamos um link de confirmação para ${email}` })
    router.push('/')
  }

  return (
    <Container width="sm" spacing="loose" className="flex flex-col gap-6">
      <Heading as="h1" size="2xl">
        Cadastro
      </Heading>

      {passwordNotSet && (
        <Alert variant="warning">
          {passwordNotSet}{' '}
          <Link href="/login" className="text-primary hover:underline">
            Ir para o login
          </Link>
        </Alert>
      )}

      <RegisterForm onSuccess={handleSuccess} onPasswordNotSet={setPasswordNotSet} />

      <Text size="sm" color="muted">
        Já tem conta?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </Text>
    </Container>
  )
}
