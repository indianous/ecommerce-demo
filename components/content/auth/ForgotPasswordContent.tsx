'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Alert, Container, Heading, Text } from 'base-ds'
import { ForgotPasswordForm } from '@/components/forms/ForgotPasswordForm'

export function ForgotPasswordContent() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.status === 429) {
        setError('Muitas tentativas. Tente de novo em alguns minutos.')
      } else if (!res.ok) {
        setError('Não foi possível enviar agora. Tente de novo em instantes.')
      } else {
        setSent(true)
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container width="sm" spacing="loose" className="flex flex-col gap-6">
      <Heading as="h1" size="2xl">
        Esqueci minha senha
      </Heading>

      {sent ? (
        // A mesma mensagem para qualquer e-mail: a tela não revela quais contas existem.
        <Alert variant="success">Se houver uma conta com este e-mail, enviamos um link. Ele vale por 1 hora.</Alert>
      ) : (
        <>
          <Text size="sm" color="muted">
            Informe o e-mail da sua conta. Enviaremos um link para você escolher uma nova senha.
          </Text>
          {error && <Alert variant="danger">{error}</Alert>}
          <ForgotPasswordForm email={email} onEmailChange={setEmail} onSubmit={handleSubmit} submitting={submitting} />
        </>
      )}

      <Text size="sm">
        <Link href="/login" className="text-primary hover:underline">
          Voltar para o login
        </Link>
      </Text>
    </Container>
  )
}
