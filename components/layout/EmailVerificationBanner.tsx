'use client'

import { Alert, Button, Icon } from '@indianous/base-ds'
import { useResendVerification } from '@/lib/useResendVerification'
import { useAuthStore } from '@/stores/auth.store'

/** Aviso no topo da loja para o cliente que ainda não confirmou o e-mail (sem isso, não fecha pedido). */
export function EmailVerificationBanner() {
  const user = useAuthStore((s) => s.user)
  if (!user || user.role !== 'CUSTOMER' || user.emailVerified !== false) return null
  return <UnverifiedEmailAlert email={user.email} />
}

function UnverifiedEmailAlert({ email }: { email: string }) {
  const { resend, sending, disabled } = useResendVerification(email)

  return (
    <Alert
      variant="warning"
      layout="full"
      actions={
        <Button
          leftIcon={<Icon name="Mail" size="sm" />}
          variant="outline"
          size="sm"
          onClick={() => void resend()}
          disabled={disabled}
          isLoading={sending}
        >
          Reenviar e-mail
        </Button>
      }
    >
      Confirme seu e-mail {email} para poder finalizar pedidos.
    </Alert>
  )
}
