'use client'

import { Button, Card, Heading, Icon, Text } from 'base-ds'
import { useResendVerification } from '@/lib/useResendVerification'

/** No checkout, no lugar do botão de finalizar, enquanto o e-mail não for confirmado. */
export function EmailVerificationCard({ email }: { email: string | undefined }) {
  const { resend, sending, disabled } = useResendVerification(email)

  return (
    <Card variant="outlined" header={<Heading as="h2" size="xl">Confirme seu e-mail para finalizar</Heading>}>
      <div className="flex flex-col gap-3">
        <Text size="sm" color="muted">
          Enviamos um link de confirmação{email ? ` para ${email}` : ''}. Depois de confirmar, é só voltar e finalizar o pedido.
        </Text>
        <div>
          <Button
            leftIcon={<Icon name="Mail" size="sm" />}
            variant="outline"
            onClick={() => void resend()}
            disabled={disabled}
            isLoading={sending}
          >
            Reenviar e-mail
          </Button>
        </div>
      </div>
    </Card>
  )
}
